-- ============================================================
-- UniGear: Fix return_booking enum assignment
-- 校园资产管理系统 — 修复 return_booking 中 asset_status 枚举赋值
-- Migration: 026_fix_return_booking_asset_status_cast.sql
-- Date: 2026-03-29
--
-- Purpose:
--   Fix the CASE expression in return_booking so PostgreSQL treats the
--   assigned asset status as asset_status instead of plain text.
-- ============================================================

CREATE OR REPLACE FUNCTION return_booking(p_booking_id UUID, p_photo_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id              UUID;
  v_borrower_id           UUID;
  v_status                booking_status;
  v_has_unresolved_damage BOOLEAN := FALSE;
  v_return_message        TEXT;
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

  UPDATE bookings
  SET status = 'returned',
      return_photo_url = p_photo_url,
      actual_return_date = now(),
      updated_at = now()
  WHERE id = p_booking_id;

  SELECT EXISTS (
    SELECT 1
    FROM damage_reports
    WHERE booking_id = p_booking_id
      AND status IN ('open', 'investigating')
  )
  INTO v_has_unresolved_damage;

  UPDATE assets
  SET status = CASE
        WHEN v_has_unresolved_damage THEN 'maintenance'::asset_status
        ELSE 'available'::asset_status
      END,
      updated_at = now()
  WHERE id = v_asset_id;

  PERFORM update_credit_score(v_borrower_id, 5, 'return_bonus');

  v_return_message := CASE
    WHEN v_has_unresolved_damage THEN
      'Your asset has been returned. Credit score +5. A related damage report is still under review, so the item remains in maintenance for now.'
    ELSE
      'Your asset has been returned. Credit score +5.'
  END;

  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    v_borrower_id,
    'system',
    'Asset returned successfully',
    v_return_message,
    jsonb_build_object(
      'booking_id', p_booking_id,
      'reason', 'return_bonus_granted',
      'credit_delta', 5,
      'damage_report_pending', v_has_unresolved_damage
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION return_booking(UUID, TEXT) TO authenticated;

-- ============================================================
-- END OF MIGRATION 026
-- ============================================================
