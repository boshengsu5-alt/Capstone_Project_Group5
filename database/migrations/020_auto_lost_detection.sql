-- ============================================================
-- UniGear: Three-node overdue system + auto lost detection
-- 资产管理系统 — 三节点逾期扣分 + 30天自动丢失判定
-- Migration: 020_auto_lost_detection.sql
-- Date: 2026-03-28
-- Author: Bosheng
--
-- 逻辑（§5.3）：
--   Day 1：active → overdue，扣 -10 分（首次检测）
--   Day 7：仍未还，扣 -15 分（节点加重）
--   Day 30：仍未还，扣 -25 分，自动创建 lost 损坏报告
--   三节点合计上限 -50 分，Day 30 后不再继续扣分
--
-- Rollback:
--   ALTER TABLE damage_reports DROP COLUMN IF EXISTS auto_generated;
--   ALTER TABLE bookings DROP COLUMN IF EXISTS overdue_day7_applied;
--   ALTER TABLE bookings DROP COLUMN IF EXISTS overdue_day30_applied;
--   -- 恢复旧版函数请从 019_enrich_overdue_notification_metadata.sql 重新执行
-- ============================================================

-- ============================================================
-- 1. 新增字段
-- ============================================================

-- damage_reports：标记是否为系统自动生成（区分三种丢失场景）
ALTER TABLE damage_reports
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false;

-- bookings：记录各节点是否已触发，防止重复扣分
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS overdue_day7_applied BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS overdue_day30_applied BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. 重写 check_overdue_bookings()，实现三节点逻辑
-- ============================================================

CREATE OR REPLACE FUNCTION check_overdue_bookings()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r              RECORD;
  v_asset_name   TEXT;
  v_overdue_days INTEGER;
BEGIN

  -- ──────────────────────────────────────────────────────────
  -- 节点 1：active → overdue（首次检测，扣 -10 分）
  -- ──────────────────────────────────────────────────────────
  FOR r IN
    SELECT b.id, b.borrower_id, b.asset_id, a.name AS asset_name
    FROM   bookings b
    JOIN   assets   a ON a.id = b.asset_id
    WHERE  b.status   = 'active'
      AND  b.end_date < now()
  LOOP
    v_asset_name   := COALESCE(r.asset_name, '设备');
    v_overdue_days := GREATEST(1,
      CEIL(EXTRACT(EPOCH FROM (now() - r.end_date)) / 86400.0)::INTEGER
    );

    -- booking 状态切换为逾期
    UPDATE bookings SET status = 'overdue' WHERE id = r.id;

    -- 扣减信用分 -10
    PERFORM update_credit_score(r.borrower_id, -10, 'overdue_day1');

    -- 发送通知
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      r.borrower_id,
      'overdue_alert',
      '逾期提醒 — 信用分 -10',
      format(
        '您借用的「%s」已逾期 %s 天，已扣减 10 信用分。请尽快归还，否则将持续扣分。',
        v_asset_name, v_overdue_days
      ),
      jsonb_build_object(
        'booking_id',   r.id,
        'asset_id',     r.asset_id,
        'asset_name',   v_asset_name,
        'overdue_days', v_overdue_days,
        'penalty',      10,
        'credit_delta', -10,
        'checkpoint',   'day1'
      )
    );
  END LOOP;

  -- ──────────────────────────────────────────────────────────
  -- 节点 2：逾期满 7 天（额外扣 -15 分，仅触发一次）
  -- ──────────────────────────────────────────────────────────
  FOR r IN
    SELECT b.id, b.borrower_id, b.asset_id, a.name AS asset_name
    FROM   bookings b
    JOIN   assets   a ON a.id = b.asset_id
    WHERE  b.status               = 'overdue'
      AND  b.end_date             < now() - INTERVAL '7 days'
      AND  b.overdue_day7_applied = false
  LOOP
    v_asset_name   := COALESCE(r.asset_name, '设备');
    v_overdue_days := GREATEST(7,
      CEIL(EXTRACT(EPOCH FROM (now() - r.end_date)) / 86400.0)::INTEGER
    );

    -- 标记节点已触发，防止重复扣
    UPDATE bookings SET overdue_day7_applied = true WHERE id = r.id;

    -- 扣减信用分 -15
    PERFORM update_credit_score(r.borrower_id, -15, 'overdue_day7');

    -- 发送通知
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      r.borrower_id,
      'overdue_alert',
      '严重逾期警告 — 再扣 15 信用分',
      format(
        '您借用的「%s」已逾期 %s 天！再次扣减 15 信用分。逾期满 30 天将被系统自动判定为丢失，请立即归还！',
        v_asset_name, v_overdue_days
      ),
      jsonb_build_object(
        'booking_id',   r.id,
        'asset_id',     r.asset_id,
        'asset_name',   v_asset_name,
        'overdue_days', v_overdue_days,
        'penalty',      15,
        'credit_delta', -15,
        'checkpoint',   'day7'
      )
    );
  END LOOP;

  -- ──────────────────────────────────────────────────────────
  -- 节点 3：逾期满 30 天 → 自动判定丢失（扣 -25 分，封顶 -50）
  -- ──────────────────────────────────────────────────────────
  FOR r IN
    SELECT b.id, b.borrower_id, b.asset_id, a.name AS asset_name
    FROM   bookings b
    JOIN   assets   a ON a.id = b.asset_id
    WHERE  b.status                = 'overdue'
      AND  b.end_date              < now() - INTERVAL '30 days'
      AND  b.overdue_day30_applied = false
  LOOP
    v_asset_name := COALESCE(r.asset_name, '设备');

    -- 标记节点已触发，防止重复扣
    UPDATE bookings SET overdue_day30_applied = true WHERE id = r.id;

    -- 扣减信用分 -25（三节点合计封顶 -50）
    PERFORM update_credit_score(r.borrower_id, -25, 'overdue_day30_lost');

    -- 自动创建 lost 损坏报告（auto_generated = true，管理员确认时不再额外扣分）
    INSERT INTO damage_reports (
      booking_id, asset_id, reporter_id,
      description, severity, photo_urls, status, auto_generated
    ) VALUES (
      r.id,
      r.asset_id,
      r.borrower_id,
      format(
        '【系统自动生成】设备「%s」逾期超过 30 天，系统自动判定为丢失。赔偿金额为设备全款，不计折旧。',
        v_asset_name
      ),
      'lost',
      '{}',
      'open',
      true
    );

    -- 发送丢失判定通知
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      r.borrower_id,
      'overdue_alert',
      '设备已被判定为丢失 — 请联系管理员',
      format(
        '您借用的「%s」逾期超过 30 天，系统已自动判定为丢失。本次扣减 25 信用分（逾期总扣分已封顶 50 分）。请立即联系管理员处理全额赔偿事宜。',
        v_asset_name
      ),
      jsonb_build_object(
        'booking_id',   r.id,
        'asset_id',     r.asset_id,
        'asset_name',   v_asset_name,
        'overdue_days', GREATEST(30,
          CEIL(EXTRACT(EPOCH FROM (now() - r.end_date)) / 86400.0)::INTEGER
        ),
        'penalty',      25,
        'credit_delta', -25,
        'checkpoint',   'day30'
      )
    );
  END LOOP;

END;
$$;

GRANT EXECUTE ON FUNCTION check_overdue_bookings() TO authenticated;

-- ============================================================
-- END OF MIGRATION 020
-- ============================================================
