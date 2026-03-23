-- ============================================================
-- UniGear: RPC Functions for Booking Lifecycle
-- 校园资产管理系统 — 借用生命周期 RPC 函数
-- Migration: 003_rpc_functions.sql
-- Date: 2026-03-10 (Day 4)
-- Author: Bosheng
--
-- Rollback: DROP FUNCTION IF EXISTS activate_booking(UUID);
--           DROP FUNCTION IF EXISTS return_booking(UUID, TEXT);
-- ============================================================

-- ============================================================
-- 1. activate_booking — 扫码取货激活
-- Changes booking status from 'approved' → 'active'
-- and asset status from 'available' → 'borrowed'.
-- 将借用状态从 approved 改为 active，资产状态改为 borrowed
--
-- SECURITY DEFINER: 以数据库所有者身份运行，绕过 RLS
-- 学生无权直接 UPDATE assets 表，必须通过此函数
-- ============================================================
CREATE OR REPLACE FUNCTION activate_booking(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id UUID;
  v_borrower_id UUID;
  v_status booking_status;
  v_start_date TIMESTAMPTZ;
BEGIN
  -- 获取借用记录信息并锁定行，防止并发
  SELECT asset_id, borrower_id, status, start_date
  INTO v_asset_id, v_borrower_id, v_status, v_start_date
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- 校验：借用记录必须存在
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- 校验：只有 approved 状态才能激活
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'Booking is not in approved status (current: %)', v_status;
  END IF;

  -- 校验：只有借用者本人才能激活（取货）
  IF v_borrower_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the borrower can activate this booking';
  END IF;

  -- 校验：只有到了借用开始日期当天或之后才能取货
  IF CURRENT_DATE < v_start_date::date THEN
    RAISE EXCEPTION '还未到取货日期，请在 % 当天或之后扫码取货', v_start_date::date;
  END IF;

  -- 更新借用状态为 active
  UPDATE bookings
  SET status = 'active',
      updated_at = now()
  WHERE id = p_booking_id;

  -- 更新资产状态为 borrowed
  UPDATE assets
  SET status = 'borrowed',
      updated_at = now()
  WHERE id = v_asset_id;
END;
$$;

-- 授予已认证用户调用权限
GRANT EXECUTE ON FUNCTION activate_booking(UUID) TO authenticated;

-- ============================================================
-- 2. return_booking — 归还资产
-- Changes booking status from 'active' → 'returned',
-- asset status from 'borrowed' → 'available',
-- and adds +5 credit score to borrower.
-- 将借用状态改为 returned，资产状态改回 available，信用分 +5
--
-- SECURITY DEFINER: 绕过 RLS，学生无权直接改 assets / profiles
-- ============================================================
CREATE OR REPLACE FUNCTION return_booking(p_booking_id UUID, p_photo_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id UUID;
  v_borrower_id UUID;
  v_status booking_status;
  v_current_score INTEGER;
BEGIN
  -- 获取借用记录信息并锁定
  SELECT asset_id, borrower_id, status
  INTO v_asset_id, v_borrower_id, v_status
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- 校验：借用记录必须存在
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- 校验：只有 active 或 overdue 状态才能归还
  IF v_status NOT IN ('active', 'overdue') THEN
    RAISE EXCEPTION 'Booking is not in active/overdue status (current: %)', v_status;
  END IF;

  -- 校验：只有借用者本人才能归还
  IF v_borrower_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the borrower can return this booking';
  END IF;

  -- 更新借用记录：状态 → returned，记录归还照片和实际归还时间
  UPDATE bookings
  SET status = 'returned',
      return_photo_url = p_photo_url,
      actual_return_date = now(),
      updated_at = now()
  WHERE id = p_booking_id;

  -- 更新资产状态为 available
  UPDATE assets
  SET status = 'available',
      updated_at = now()
  WHERE id = v_asset_id;

  -- 信用分 +5（上限 200）
  SELECT credit_score INTO v_current_score
  FROM profiles WHERE id = v_borrower_id;

  UPDATE profiles
  SET credit_score = LEAST(v_current_score + 5, 200),
      updated_at = now()
  WHERE id = v_borrower_id;

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

-- 授予已认证用户调用权限
GRANT EXECUTE ON FUNCTION return_booking(UUID, TEXT) TO authenticated;

-- ============================================================
-- END OF MIGRATION 003
-- ============================================================
