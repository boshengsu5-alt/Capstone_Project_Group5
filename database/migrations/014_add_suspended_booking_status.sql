-- ============================================================
-- Migration: 014_add_suspended_booking_status.sql
-- Description: Add 'suspended' to booking_status enum for maintenance holds.
-- 新增 suspended 状态：设备维修期间的预约暂停，修好后可自动恢复。
-- Date: 2026-03-26
--
-- Rollback: Cannot remove enum values in Postgres; deploy with care.
-- ============================================================

-- 1. 新增枚举值
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'suspended';

-- 2. 更新 create_booking RPC：suspended 状态的预约仍占用日期（修好后可恢复）
CREATE OR REPLACE FUNCTION create_booking(
  p_asset_id   UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date   TIMESTAMPTZ,
  p_notes      TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_count INTEGER;
  v_new_booking_id UUID;
BEGIN
  IF p_end_date <= p_start_date THEN
    RAISE EXCEPTION '结束时间必须晚于开始时间';
  END IF;

  IF p_start_date::date < CURRENT_DATE THEN
    RAISE EXCEPTION '不能预订过去的日期';
  END IF;

  PERFORM id FROM assets WHERE id = p_asset_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '资产不存在：%', p_asset_id;
  END IF;

  -- suspended 也纳入冲突检测，确保暂停中的订单仍占住日期
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE asset_id = p_asset_id
    AND status IN ('pending', 'approved', 'active', 'suspended')
    AND start_date < p_end_date
    AND end_date   > p_start_date;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION '时间冲突：该设备在所选日期段内已被预订，请选择其他时间';
  END IF;

  INSERT INTO bookings (
    asset_id, borrower_id, start_date, end_date,
    status, notes, pickup_photo_url, return_photo_url, rejection_reason
  )
  VALUES (
    p_asset_id, auth.uid(), p_start_date, p_end_date,
    'pending', COALESCE(p_notes, ''), '', '', ''
  )
  RETURNING id INTO v_new_booking_id;

  RETURN v_new_booking_id;
END;
$$;

-- 3. 更新 restrict_booking_update 触发器：允许学生取消自己的 suspended 订单
CREATE OR REPLACE FUNCTION restrict_booking_update()
RETURNS TRIGGER AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ) INTO is_admin;

  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- 学生可将 pending/approved/suspended → cancelled
  IF OLD.status IN ('pending', 'approved', 'suspended') AND NEW.status = 'cancelled' THEN
    NEW.asset_id          := OLD.asset_id;
    NEW.borrower_id       := OLD.borrower_id;
    NEW.approver_id       := OLD.approver_id;
    NEW.start_date        := OLD.start_date;
    NEW.end_date          := OLD.end_date;
    NEW.actual_return_date := OLD.actual_return_date;
    NEW.pickup_photo_url  := OLD.pickup_photo_url;
    NEW.return_photo_url  := OLD.return_photo_url;
    NEW.notes             := OLD.notes;
    NEW.rejection_reason  := OLD.rejection_reason;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION '无权修改此借用记录的状态';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- END OF MIGRATION 014
-- ============================================================
