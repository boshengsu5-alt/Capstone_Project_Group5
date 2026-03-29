-- ============================================================
-- UniGear: Reversible lost-item booking flow
-- 校园资产管理系统 — 可恢复的“设备丢失”借用流程
-- Migration: 027_lost_reported_booking_flow.sql
-- Date: 2026-03-29
--
-- Goals:
--  1. Add booking statuses `lost_reported` (reversible) and `lost` (final).
--  2. When a damage report is filed with severity = lost and status open/investigating,
--     move the booking into lost_reported and keep the asset unavailable.
--  3. If that report is edited away from lost, or dismissed before confirmation,
--     restore the booking back to the normal borrowing flow.
--  4. Existing resolved lost reports are backfilled to final booking status = lost.
-- ============================================================

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'lost_reported';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'lost';

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
          'reason', 'LOST_REPORT_REVERSED'
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

  -- Any unresolved lost report freezes the booking into a reversible lost state.
  IF NEW.severity = 'lost' AND NEW.status IN ('open', 'investigating') THEN
    UPDATE bookings
    SET status = 'lost_reported',
        rejection_reason = 'LOST_REPORTED',
        updated_at = now()
    WHERE id = NEW.booking_id
      AND status IN ('active', 'overdue');

    RETURN NEW;
  END IF;

  -- If a previously unresolved lost report is changed away from lost, or dismissed,
  -- restore the booking back to the normal borrowing lifecycle.
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

DROP TRIGGER IF EXISTS sync_damage_report_maintenance_on_insert ON damage_reports;
DROP TRIGGER IF EXISTS sync_damage_report_booking_lost_state ON damage_reports;
CREATE TRIGGER sync_damage_report_booking_lost_state
  AFTER INSERT OR UPDATE OF severity, status ON damage_reports
  FOR EACH ROW
  EXECUTE FUNCTION sync_damage_report_booking_lost_state();

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
    PERFORM apply_damage_report_maintenance(r.id);

    UPDATE bookings
    SET status = 'lost_reported',
        rejection_reason = 'LOST_REPORTED',
        updated_at = now()
    WHERE id = r.booking_id
      AND status IN ('active', 'overdue');
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
END;
$$;

-- ============================================================
-- END OF MIGRATION 027
-- ============================================================
