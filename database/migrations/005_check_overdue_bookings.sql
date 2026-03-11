-- ============================================================
-- UniGear: Overdue Booking Detection RPC Function
-- 校园资产管理系统 — 逾期借用自动检测 RPC 函数
-- Migration: 005_check_overdue_bookings.sql
-- Date: 2026-03-11 (Day 5)
-- Author: Bosheng
--
-- Rollback: DROP FUNCTION IF EXISTS check_overdue_bookings();
--           DROP FUNCTION IF EXISTS update_credit_score(UUID, INTEGER, TEXT);
-- ============================================================

-- ============================================================
-- 1. update_credit_score — 信用分增减（通用工具函数）
-- Adjusts a user's credit score with bounds checking (0-200).
-- 调整用户信用分，自动限制在 0-200 范围内
--
-- SECURITY DEFINER: 学生无权直接 UPDATE profiles.credit_score
-- ============================================================
CREATE OR REPLACE FUNCTION update_credit_score(
  p_user_id UUID,
  p_delta INTEGER,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_score INTEGER;
  v_new_score INTEGER;
BEGIN
  SELECT credit_score INTO v_current_score
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- 计算新分数，锁定在 0-200 范围
  v_new_score := GREATEST(0, LEAST(200, v_current_score + p_delta));

  UPDATE profiles
  SET credit_score = v_new_score,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_credit_score(UUID, INTEGER, TEXT) TO authenticated;

-- ============================================================
-- 2. check_overdue_bookings — 逾期自动检测
-- Scans all 'active' bookings past their end_date, marks them
-- as 'overdue', inserts overdue notifications, and deducts
-- credit score (-10 per call).
-- 扫描所有超过结束日期的 active 借用，标记为 overdue，
-- 插入催还通知，扣减信用分（每次调用 -10）
--
-- SECURITY DEFINER: 需要跨表操作 bookings + notifications + profiles
-- 学生端 HomeScreen 加载时兜底调用，确保逾期检测覆盖
--
-- 注意：pg_cron 在 Supabase Free Plan 不可用，
-- 改用 Supabase Edge Function + Dashboard Schedules 每小时执行，
-- 移动端 HomeScreen 加载时调用 supabase.rpc('check_overdue_bookings') 兜底
-- ============================================================
CREATE OR REPLACE FUNCTION check_overdue_bookings()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- 遍历所有已过期但仍为 active 状态的借用记录
  FOR r IN
    SELECT id, asset_id, borrower_id
    FROM bookings
    WHERE status = 'active'
      AND end_date < now()
  LOOP
    -- 将借用状态改为 overdue（资产状态保持 borrowed，因为东西还没还）
    UPDATE bookings
    SET status = 'overdue',
        updated_at = now()
    WHERE id = r.id;

    -- 插入逾期催还通知
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      r.borrower_id,
      'overdue_alert',
      'Overdue: Please return the asset immediately',
      'Your booking has exceeded the return date. Please return the asset as soon as possible to avoid further credit score deduction.',
      jsonb_build_object('booking_id', r.id, 'asset_id', r.asset_id)
    );

    -- 扣减信用分 -10
    PERFORM update_credit_score(r.borrower_id, -10, 'overdue_booking');
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION check_overdue_bookings() TO authenticated;

-- ============================================================
-- END OF MIGRATION 005
-- ============================================================
