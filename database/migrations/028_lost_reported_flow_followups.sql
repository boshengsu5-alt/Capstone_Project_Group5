-- ============================================================
-- UniGear: Lost-reported flow follow-up fixes
-- 校园资产管理系统 — 丢失待确认流程补丁与赔偿同步
-- Migration: 028_lost_reported_flow_followups.sql
-- Date: 2026-03-29
--
-- Purpose:
--   1. Make unresolved lost reports move bookings into lost_reported even if
--      the return photo had already been submitted and the booking is currently returned.
--   2. Make resolved lost reports always hard-set booking -> lost at DB level.
--   3. Keep compensation_cases in sync when a damage report is edited from
--      lost -> normal damage (or otherwise updated) before admin confirmation.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_damage_report_booking_lost_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restore_status booking_status;
  v_other_unresolved_damage BOOLEAN := FALSE;
BEGIN
  IF NEW.status IN ('open', 'investigating') THEN
    PERFORM apply_damage_report_maintenance(NEW.id);
  END IF;

  IF NEW.severity = 'lost' AND NEW.status IN ('open', 'investigating') THEN
    UPDATE bookings
    SET status = 'lost_reported',
        rejection_reason = 'LOST_REPORTED',
        updated_at = now()
    WHERE id = NEW.booking_id
      AND status IN ('active', 'overdue', 'returned');

    RETURN NEW;
  END IF;

  IF NEW.severity = 'lost' AND NEW.status = 'resolved' THEN
    UPDATE bookings
    SET status = 'lost',
        rejection_reason = 'LOST_CONFIRMED',
        updated_at = now()
    WHERE id = NEW.booking_id
      AND status <> 'lost';

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.severity = 'lost'
     AND OLD.status IN ('open', 'investigating')
     AND (NEW.severity <> 'lost' OR NEW.status = 'dismissed') THEN

    v_restore_status := derive_booking_resumed_status(NEW.booking_id);

    UPDATE bookings
    SET status = v_restore_status,
        rejection_reason = CASE
          WHEN v_restore_status = 'returned' THEN 'VERIFIED'
          ELSE ''
        END,
        updated_at = now()
    WHERE id = NEW.booking_id
      AND status = 'lost_reported';

    SELECT EXISTS (
      SELECT 1
      FROM damage_reports
      WHERE asset_id = NEW.asset_id
        AND id <> NEW.id
        AND status IN ('open', 'investigating')
    )
    INTO v_other_unresolved_damage;

    IF NEW.status IN ('open', 'investigating') THEN
      v_other_unresolved_damage := TRUE;
    END IF;

    IF NOT v_other_unresolved_damage THEN
      UPDATE assets
      SET status = CASE
            WHEN v_restore_status IN ('active', 'overdue') THEN 'borrowed'::asset_status
            WHEN v_restore_status = 'returned' THEN 'available'::asset_status
            ELSE status
          END,
          updated_at = now()
      WHERE id = NEW.asset_id
        AND status <> 'retired';

      PERFORM restore_suspended_maintenance_bookings_for_asset(NEW.asset_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_damage_report_booking_lost_state ON damage_reports;
CREATE TRIGGER sync_damage_report_booking_lost_state
  AFTER INSERT OR UPDATE OF severity, status ON damage_reports
  FOR EACH ROW
  EXECUTE FUNCTION sync_damage_report_booking_lost_state();

CREATE OR REPLACE FUNCTION sync_compensation_case_from_damage_report_row(p_report_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report damage_reports%ROWTYPE;
  v_borrower_id UUID;
  v_amount NUMERIC;
  v_case_id UUID;
  v_existing_status compensation_status;
  v_existing_agreed NUMERIC;
  v_existing_due TIMESTAMPTZ;
  v_existing_paid NUMERIC;
  v_existing_reference TEXT;
  v_next_status compensation_status;
  v_next_agreed NUMERIC;
  v_next_due TIMESTAMPTZ;
  v_reference TEXT;
BEGIN
  SELECT * INTO v_report
  FROM damage_reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT borrower_id INTO v_borrower_id
  FROM bookings
  WHERE id = v_report.booking_id;

  IF v_borrower_id IS NULL THEN
    RETURN;
  END IF;

  v_amount := estimate_damage_compensation(
    v_report.asset_id,
    v_report.booking_id,
    v_report.reporter_id,
    v_report.severity,
    COALESCE(v_report.auto_generated, false),
    v_report.status
  );

  SELECT
    id,
    status,
    agreed_amount,
    due_date,
    paid_amount,
    payment_reference
  INTO
    v_case_id,
    v_existing_status,
    v_existing_agreed,
    v_existing_due,
    v_existing_paid,
    v_existing_reference
  FROM compensation_cases
  WHERE damage_report_id = v_report.id;

  IF v_report.status = 'dismissed' THEN
    v_next_status := 'waived';
  ELSIF v_case_id IS NOT NULL AND v_existing_status IN ('awaiting_payment', 'partially_paid', 'paid') THEN
    v_next_status := v_existing_status;
  ELSIF v_report.status = 'resolved' AND COALESCE(v_amount, 0) > 0 THEN
    v_next_status := 'awaiting_signature';
  ELSIF v_report.status = 'resolved' THEN
    v_next_status := 'waived';
  ELSE
    v_next_status := 'under_review';
  END IF;

  v_reference := COALESCE(NULLIF(v_existing_reference, ''), 'CMP-' || upper(substr(replace(v_report.id::text, '-', ''), 1, 8)));

  v_next_agreed := CASE
    WHEN v_next_status = 'waived' THEN 0
    WHEN v_case_id IS NOT NULL AND v_existing_status IN ('awaiting_payment', 'partially_paid', 'paid') THEN COALESCE(v_existing_agreed, v_amount)
    ELSE v_amount
  END;

  v_next_due := CASE
    WHEN v_next_status = 'waived' THEN NULL
    WHEN v_case_id IS NOT NULL AND v_existing_status IN ('awaiting_payment', 'partially_paid', 'paid') THEN v_existing_due
    WHEN v_report.status = 'resolved' AND COALESCE(v_amount, 0) > 0 THEN COALESCE(v_existing_due, now() + INTERVAL '7 days')
    ELSE NULL
  END;

  INSERT INTO compensation_cases (
    damage_report_id,
    booking_id,
    asset_id,
    liable_user_id,
    status,
    assessed_amount,
    agreed_amount,
    paid_amount,
    payment_reference,
    due_date
  )
  VALUES (
    v_report.id,
    v_report.booking_id,
    v_report.asset_id,
    v_borrower_id,
    v_next_status,
    v_amount,
    v_next_agreed,
    COALESCE(v_existing_paid, 0),
    v_reference,
    v_next_due
  )
  ON CONFLICT (damage_report_id) DO UPDATE
  SET booking_id = EXCLUDED.booking_id,
      asset_id = EXCLUDED.asset_id,
      liable_user_id = EXCLUDED.liable_user_id,
      status = EXCLUDED.status,
      assessed_amount = EXCLUDED.assessed_amount,
      agreed_amount = EXCLUDED.agreed_amount,
      due_date = EXCLUDED.due_date,
      payment_reference = CASE
        WHEN compensation_cases.payment_reference <> '' THEN compensation_cases.payment_reference
        ELSE EXCLUDED.payment_reference
      END,
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION sync_compensation_case_on_damage_report_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM sync_compensation_case_from_damage_report_row(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_compensation_case_on_damage_report_change ON damage_reports;
CREATE TRIGGER sync_compensation_case_on_damage_report_change
  AFTER INSERT OR UPDATE OF severity, status, description, resolution_notes ON damage_reports
  FOR EACH ROW
  EXECUTE FUNCTION sync_compensation_case_on_damage_report_change();

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, booking_id
    FROM damage_reports
    WHERE severity = 'lost'
      AND status IN ('open', 'investigating')
  LOOP
    UPDATE bookings
    SET status = 'lost_reported',
        rejection_reason = 'LOST_REPORTED',
        updated_at = now()
    WHERE id = r.booking_id
      AND status IN ('active', 'overdue', 'returned');
  END LOOP;

  UPDATE bookings b
  SET status = 'lost',
      rejection_reason = 'LOST_CONFIRMED',
      updated_at = now()
  FROM damage_reports dr
  WHERE dr.booking_id = b.id
    AND dr.severity = 'lost'
    AND dr.status = 'resolved'
    AND b.status <> 'lost';

  FOR r IN
    SELECT id
    FROM damage_reports
  LOOP
    PERFORM sync_compensation_case_from_damage_report_row(r.id);
  END LOOP;
END;
$$;

-- ============================================================
-- END OF MIGRATION 028
-- ============================================================
