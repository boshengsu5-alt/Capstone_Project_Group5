-- ============================================================
-- UniGear: Track return bonus metadata for later reversal
-- 校园资产管理系统 — 为归还奖励增加可追踪 metadata，便于损坏确认后撤销奖励
-- Migration: 015_track_return_bonus_metadata.sql
-- Date: 2026-03-27
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
  v_bonus_applied INTEGER;
BEGIN
  SELECT asset_id, borrower_id, status
  INTO v_asset_id, v_borrower_id, v_status
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  IF v_status NOT IN ('active', 'overdue') THEN
    RAISE EXCEPTION 'Booking is not in active/overdue status (current: %)', v_status;
  END IF;

  IF v_borrower_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the borrower can return this booking';
  END IF;

  UPDATE bookings
  SET status = 'returned',
      return_photo_url = p_photo_url,
      actual_return_date = now(),
      updated_at = now()
  WHERE id = p_booking_id;

  UPDATE assets
  SET status = 'available',
      updated_at = now()
  WHERE id = v_asset_id;

  SELECT credit_score INTO v_current_score
  FROM profiles
  WHERE id = v_borrower_id;

  v_bonus_applied := LEAST(v_current_score + 5, 200) - v_current_score;

  UPDATE profiles
  SET credit_score = v_current_score + v_bonus_applied,
      updated_at = now()
  WHERE id = v_borrower_id;

  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    v_borrower_id,
    'system',
    'Asset returned successfully',
    'Your asset has been returned. Credit score +5.',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'reason', 'return_bonus_granted',
      'credit_delta', v_bonus_applied
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION return_booking(UUID, TEXT) TO authenticated;
