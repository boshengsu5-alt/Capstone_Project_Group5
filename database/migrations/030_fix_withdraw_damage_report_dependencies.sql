-- ============================================================
-- UniGear: Repair withdraw damage report dependencies
-- 校园资产管理系统 — 修复撤销报修依赖缺失
-- Migration: 030_fix_withdraw_damage_report_dependencies.sql
-- Date: 2026-03-29
--
-- Purpose:
--   1. Backfill helper functions used by withdraw_own_damage_report().
--   2. Make the withdraw flow resilient even if migration 027 was not
--      fully applied before 029 was executed.
-- ============================================================

CREATE OR REPLACE FUNCTION derive_booking_resumed_status(p_booking_id UUID)
RETURNS booking_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_actual_return_date TIMESTAMPTZ;
BEGIN
  SELECT start_date, end_date, actual_return_date
  INTO v_start_date, v_end_date, v_actual_return_date
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

  IF v_start_date IS NOT NULL AND v_start_date > now() THEN
    RETURN 'approved';
  END IF;

  RETURN 'active';
END;
$$;

CREATE OR REPLACE FUNCTION restore_suspended_maintenance_bookings_for_asset(p_asset_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_asset_name TEXT;
BEGIN
  SELECT name INTO v_asset_name
  FROM assets
  WHERE id = p_asset_id;

  v_asset_name := COALESCE(v_asset_name, '设备');

  FOR r IN
    SELECT id, borrower_id, start_date
    FROM bookings
    WHERE asset_id = p_asset_id
      AND status = 'suspended'
      AND rejection_reason = 'ASSET_MAINTENANCE'
  LOOP
    IF r.start_date > now() THEN
      UPDATE bookings
      SET status = 'pending',
          rejection_reason = '',
          updated_at = now()
      WHERE id = r.id;

      INSERT INTO notifications (user_id, type, title, message, metadata)
      VALUES (
        r.borrower_id,
        'booking_restored',
        '好消息！设备状态已恢复，预约重新生效',
        format(
          '您暂停中的「%s」预约（取货日：%s）已恢复为待审批状态，请等待管理员重新确认。',
          v_asset_name,
          to_char(r.start_date, 'YYYY-MM-DD')
        ),
        jsonb_build_object(
          'booking_id', r.id,
          'asset_id', p_asset_id,
          'reason', 'DAMAGE_REPORT_WITHDRAWN'
        )
      );
    ELSE
      UPDATE bookings
      SET status = 'cancelled',
          rejection_reason = 'ASSET_MAINTENANCE_EXPIRED',
          updated_at = now()
      WHERE id = r.id;

      INSERT INTO notifications (user_id, type, title, message, metadata)
      VALUES (
        r.borrower_id,
        'booking_cancelled',
        '预约已自动取消',
        format(
          '您预约的「%s」取货日已过，系统已自动取消本次预约。如需借用，请重新预约。',
          v_asset_name
        ),
        jsonb_build_object(
          'booking_id', r.id,
          'asset_id', p_asset_id,
          'reason', 'ASSET_MAINTENANCE_EXPIRED'
        )
      );
    END IF;
  END LOOP;
END;
$$;

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
    AND status::text <> 'lost';

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
      AND status::text <> 'retired';

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
-- END OF MIGRATION 030
-- ============================================================
