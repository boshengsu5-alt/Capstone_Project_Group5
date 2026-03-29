-- ============================================================
-- UniGear: Allow students to withdraw their own unresolved damage report
-- 校园资产管理系统 — 允许学生撤销自己尚未处理的损坏/丢失报修
-- Migration: 029_withdraw_own_damage_report.sql
-- Date: 2026-03-29
--
-- Purpose:
--   1. Add a dedicated RPC so the original reporter can withdraw an
--      unresolved damage report they filed by mistake.
--   2. Restore the booking / asset lifecycle when no other unresolved
--      damage report is still blocking the asset.
--   3. Reuse the existing suspended-booking restore flow so future
--      reservations resume automatically after the mistaken report is cleared.
-- ============================================================

CREATE OR REPLACE FUNCTION restore_booking_and_asset_after_damage_clearance(
  p_booking_id UUID,
  p_asset_id UUID,
  p_ignore_report_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restore_status booking_status;
  v_other_unresolved_damage BOOLEAN := FALSE;
BEGIN
  v_restore_status := derive_booking_resumed_status(p_booking_id);

  UPDATE bookings
  SET status = v_restore_status,
      rejection_reason = CASE
        WHEN v_restore_status = 'returned' THEN 'VERIFIED'
        ELSE ''
      END,
      updated_at = now()
  WHERE id = p_booking_id
    AND status <> 'lost';

  SELECT EXISTS (
    SELECT 1
    FROM damage_reports
    WHERE asset_id = p_asset_id
      AND status IN ('open', 'investigating')
      AND (p_ignore_report_id IS NULL OR id <> p_ignore_report_id)
  )
  INTO v_other_unresolved_damage;

  IF NOT v_other_unresolved_damage THEN
    UPDATE assets
    SET status = CASE
          WHEN v_restore_status IN ('active', 'overdue') THEN 'borrowed'::asset_status
          WHEN v_restore_status = 'returned' THEN 'available'::asset_status
          ELSE status
        END,
        updated_at = now()
    WHERE id = p_asset_id
      AND status <> 'retired';

    PERFORM restore_suspended_maintenance_bookings_for_asset(p_asset_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION withdraw_own_damage_report(p_report_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report damage_reports%ROWTYPE;
  v_note TEXT;
BEGIN
  SELECT *
  INTO v_report
  FROM damage_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Damage report not found: %', p_report_id;
  END IF;

  IF v_report.reporter_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the original reporter can withdraw this damage report';
  END IF;

  IF v_report.status NOT IN ('open', 'investigating') THEN
    RAISE EXCEPTION 'This damage report can no longer be withdrawn';
  END IF;

  v_note := trim(BOTH FROM concat_ws(E'\n', NULLIF(v_report.resolution_notes, ''), '[System] Withdrawn by reporter before admin review.'));

  UPDATE damage_reports
  SET status = 'dismissed',
      resolution_notes = v_note,
      updated_at = now()
  WHERE id = p_report_id;

  PERFORM restore_booking_and_asset_after_damage_clearance(
    v_report.booking_id,
    v_report.asset_id,
    v_report.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION withdraw_own_damage_report(UUID) TO authenticated;

-- ============================================================
-- END OF MIGRATION 029
-- ============================================================
