-- ============================================================
-- UniGear: No-show reminder + auto-cancel for approved bookings
-- 未取货提醒 + 自动取消机制
-- Migration: 037_no_show_auto_cancel.sql
-- Date: 2026-04-01
-- Author: Bosheng
--
-- 逻辑：
--   +2h：预约时间过后 2 小时仍未取货（approved）→ 发站内提醒通知
--   +24h：预约时间过后 24 小时仍未取货（approved）→ 自动取消，扣 -5 信用分，资产解锁
--
-- Rollback:
--   ALTER TABLE bookings DROP COLUMN IF EXISTS no_show_reminder_sent;
--   ALTER TYPE notification_type RENAME TO notification_type_old;
--   CREATE TYPE notification_type AS ENUM (
--     'booking_approved','booking_rejected','return_reminder',
--     'overdue_alert','damage_reported','system'
--   );
--   -- 迁移现有数据后删除旧类型（需手动处理 pickup_reminder/no_show_cancelled 行）
--   DROP FUNCTION IF EXISTS check_no_show_bookings();
-- ============================================================

-- ============================================================
-- 1. 新增字段：bookings 表
-- ============================================================

-- 标记是否已发送 +2h 取货提醒，防止重复发送
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS no_show_reminder_sent BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. 扩展 notification_type 枚举
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pickup_reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'no_show_cancelled';

-- ============================================================
-- 3. 创建 check_no_show_bookings() RPC 函数
-- ============================================================

CREATE OR REPLACE FUNCTION check_no_show_bookings()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r            RECORD;
  v_asset_name TEXT;
BEGIN

  -- ──────────────────────────────────────────────────────────
  -- 节点 1：超过取货时间 +2h，发送提醒（每单仅触发一次）
  -- ──────────────────────────────────────────────────────────
  FOR r IN
    SELECT b.id, b.borrower_id, b.asset_id, a.name AS asset_name
    FROM   bookings b
    JOIN   assets   a ON a.id = b.asset_id
    WHERE  b.status                  = 'approved'
      AND  b.start_date              < now() - INTERVAL '2 hours'
      AND  b.no_show_reminder_sent   = false
  LOOP
    v_asset_name := COALESCE(r.asset_name, '设备');

    -- 标记已发送，防止重复触发
    UPDATE bookings
       SET no_show_reminder_sent = true
     WHERE id = r.id;

    -- 发送站内提醒通知
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      r.borrower_id,
      'pickup_reminder',
      '取货提醒 — 请尽快前往取货',
      format(
        '您预约的「%s」已超过取货时间 2 小时，请尽快前往取货。若超过 24 小时仍未取货，预约将被系统自动取消。',
        v_asset_name
      ),
      jsonb_build_object(
        'booking_id', r.id,
        'asset_id',   r.asset_id,
        'asset_name', v_asset_name
      )
    );
  END LOOP;

  -- ──────────────────────────────────────────────────────────
  -- 节点 2：超过取货时间 +24h，自动取消，扣 -5 信用分
  -- ──────────────────────────────────────────────────────────
  FOR r IN
    SELECT b.id, b.borrower_id, b.asset_id, a.name AS asset_name
    FROM   bookings b
    JOIN   assets   a ON a.id = b.asset_id
    WHERE  b.status     = 'approved'
      AND  b.start_date < now() - INTERVAL '24 hours'
  LOOP
    v_asset_name := COALESCE(r.asset_name, '设备');

    -- 取消订单
    UPDATE bookings
       SET status = 'cancelled'
     WHERE id = r.id;

    -- 解锁资产（恢复为可借用）
    UPDATE assets
       SET status = 'available'
     WHERE id = r.asset_id;

    -- 扣减信用分 -5（爽约惩罚）
    PERFORM update_credit_score(r.borrower_id, -5, 'no_show_cancelled');

    -- 发送自动取消通知
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      r.borrower_id,
      'no_show_cancelled',
      '预约已自动取消 — 信用分 -5',
      format(
        '您预约的「%s」因超过 24 小时未取货，已被系统自动取消，扣减 5 信用分。如需继续借用请重新提交申请。',
        v_asset_name
      ),
      jsonb_build_object(
        'booking_id',   r.id,
        'asset_id',     r.asset_id,
        'asset_name',   v_asset_name,
        'credit_delta', -5,
        'reason',       'no_show_cancelled'
      )
    );
  END LOOP;

END;
$$;

GRANT EXECUTE ON FUNCTION check_no_show_bookings() TO authenticated;

-- ============================================================
-- END OF MIGRATION 037
-- ============================================================
