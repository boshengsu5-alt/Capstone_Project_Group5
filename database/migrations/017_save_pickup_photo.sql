-- ============================================================
-- UniGear: Save pickup photo RPC — 取货拍照保存函数
-- Migration: 017_save_pickup_photo.sql
-- Date: 2026-03-27
-- Author: Bosheng
--
-- Adds an RPC function for students to save their pickup
-- condition photo after scanning and activating a booking.
-- Students cannot UPDATE bookings directly (RLS), so this
-- SECURITY DEFINER function bridges the gap.
--
-- 新增取货照片保存 RPC 函数。学生无权直接 UPDATE bookings 表，
-- 通过 SECURITY DEFINER 函数绕过 RLS 限制。
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS save_pickup_photo(UUID, TEXT);
-- ============================================================

CREATE OR REPLACE FUNCTION save_pickup_photo(
  p_booking_id UUID,
  p_photo_url  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_borrower_id UUID;
  v_status booking_status;
BEGIN
  -- 获取借用记录并锁定
  SELECT borrower_id, status
  INTO v_borrower_id, v_status
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- 借用记录必须存在
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- 只有借用者本人可以上传取货照片
  IF v_borrower_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the borrower can upload pickup photo';
  END IF;

  -- 只有 active 状态（刚激活）才允许上传取货照片
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Booking is not in active status (current: %)', v_status;
  END IF;

  -- 保存取货照片 URL
  UPDATE bookings
  SET pickup_photo_url = p_photo_url,
      updated_at = now()
  WHERE id = p_booking_id;
END;
$$;

-- ============================================================
-- END OF MIGRATION 017
-- ============================================================
