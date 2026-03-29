-- ============================================================
-- UniGear: Fix damage-flow restore status after lost reversal / withdraw
-- 校园资产管理系统 — 修复撤销报失后误回到“已通过”的状态
-- Migration: 031_fix_damage_flow_restore_status.sql
-- Date: 2026-03-29
--
-- Purpose:
--   1. Damage-report reversal should restore the current booking back to the
--      active borrowing flow, not the pickup flow.
--   2. If a booking has already reached the damage-report stage, it must only
--      resume to returned / overdue / active.
--   3. Backfill existing rows that were incorrectly restored to approved.
-- ============================================================

CREATE OR REPLACE FUNCTION derive_booking_resumed_status(p_booking_id UUID)
RETURNS booking_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end_date TIMESTAMPTZ;
  v_actual_return_date TIMESTAMPTZ;
BEGIN
  SELECT end_date, actual_return_date
  INTO v_end_date, v_actual_return_date
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  IF v_actual_return_date IS NOT NULL THEN
    RETURN 'returned';
  END IF;

  IF v_end_date IS NOT NULL AND v_end_date < now() THEN
    RETURN 'overdue';
  END IF;

  RETURN 'active';
END;
$$;

DO $$
BEGIN
  UPDATE bookings b
  SET status = derive_booking_resumed_status(b.id),
      rejection_reason = CASE
        WHEN derive_booking_resumed_status(b.id) = 'returned' THEN 'VERIFIED'
        ELSE ''
      END,
      updated_at = now()
  WHERE b.status = 'approved'
    AND EXISTS (
      SELECT 1
      FROM damage_reports dr
      WHERE dr.booking_id = b.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM damage_reports dr
      WHERE dr.booking_id = b.id
        AND dr.status IN ('open', 'investigating')
    );
END;
$$;

-- ============================================================
-- END OF MIGRATION 031
-- ============================================================
