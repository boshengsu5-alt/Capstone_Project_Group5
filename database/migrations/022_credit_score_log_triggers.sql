-- ============================================================
-- UniGear: Credit Score Logging in RPC Functions
-- 校园资产管理系统 — 信用分变动写入日志
-- Migration: 022_credit_score_log_triggers.sql
-- Date: 2026-03-28
--
-- Purpose: Modify update_credit_score and return_booking to also
-- insert a record into credit_score_logs on every credit change.
-- 目的：修改 update_credit_score 和 return_booking 函数，每次改分时
-- 同步写入 credit_score_logs，为用户提供完整的信用分变动明细。
--
-- Depends on: 021_credit_score_logs.sql (credit_score_logs table must exist)
--
-- Rollback:
--   Re-apply the original update_credit_score from 005_check_overdue_bookings.sql
--   Re-apply the original return_booking from 003_rpc_functions.sql
-- ============================================================

-- ============================================================
-- 1. update_credit_score — 新增写入 credit_score_logs
-- Same signature as before; existing callers are unaffected.
-- 保持签名不变，所有已有调用方无需修改
-- ============================================================
CREATE OR REPLACE FUNCTION update_credit_score(
  p_user_id UUID,
  p_delta   INTEGER,
  p_reason  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_score INTEGER;
  v_new_score     INTEGER;
BEGIN
  SELECT credit_score INTO v_current_score
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- 计算新分数，锁定在 0-200 范围内
  v_new_score := GREATEST(0, LEAST(200, v_current_score + p_delta));

  UPDATE profiles
  SET credit_score = v_new_score,
      updated_at   = now()
  WHERE id = p_user_id;

  -- 写入信用分日志（SECURITY DEFINER 函数绕过 RLS，可直接插入）
  -- balance_after 记录本次变动后的实际余额，供前端直接展示
  INSERT INTO credit_score_logs (user_id, delta, balance_after, reason)
  VALUES (p_user_id, p_delta, v_new_score, p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION update_credit_score(UUID, INTEGER, TEXT) TO authenticated;

-- ============================================================
-- 2. return_booking — 替换直接 UPDATE profiles 为调用 update_credit_score
-- This ensures the +5 return bonus is also logged in credit_score_logs.
-- 归还 +5 奖励改为走 update_credit_score，确保同步写入日志
--
-- All other logic (status update, asset status, notification) unchanged.
-- ============================================================
CREATE OR REPLACE FUNCTION return_booking(p_booking_id UUID, p_photo_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id    UUID;
  v_borrower_id UUID;
  v_status      booking_status;
BEGIN
  -- 获取借用记录信息并锁定，防止并发
  SELECT asset_id, borrower_id, status
  INTO v_asset_id, v_borrower_id, v_status
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- 只有 active 或 overdue 状态才能归还
  IF v_status NOT IN ('active', 'overdue') THEN
    RAISE EXCEPTION 'Booking is not in active/overdue status (current: %)', v_status;
  END IF;

  -- 只有借用者本人才能归还（auth.uid() 在 SECURITY DEFINER 中不可用，
  -- 此校验由上层 service 层保证，此处保留注释以说明意图）
  -- Only the borrower can return; enforced at service layer above this RPC.

  -- 更新借用记录：状态、归还照片、实际归还时间
  UPDATE bookings
  SET status            = 'returned',
      return_photo_url  = p_photo_url,
      actual_return_date = now(),
      updated_at        = now()
  WHERE id = p_booking_id;

  -- 更新资产状态为 available
  UPDATE assets
  SET status     = 'available',
      updated_at = now()
  WHERE id = v_asset_id;

  -- 信用分 +5（上限 200），通过 update_credit_score 同步写入日志
  PERFORM update_credit_score(v_borrower_id, 5, 'return_bonus');

  -- 插入归还成功通知
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    v_borrower_id,
    'system',
    'Asset returned successfully',
    'Your asset has been returned. Credit score +5.',
    jsonb_build_object('booking_id', p_booking_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION return_booking(UUID, TEXT) TO authenticated;

-- ============================================================
-- END OF MIGRATION 022
-- ============================================================
