-- ============================================================
-- UniGear: Damage maintenance enforcement and suspended booking sync
-- 校园资产管理系统 — 报损即维护、暂停预约与重新上架硬约束
-- Migration: 025_damage_maintenance_enforcement.sql
-- Date: 2026-03-29
--
-- Purpose:
--   1. Any newly created open/investigating damage report immediately moves
--      the asset into maintenance and suspends future pending/approved bookings.
--   2. Prevent assets from being re-listed while unresolved damage reports exist.
--   3. Add a shared RPC to auto-cancel maintenance-suspended bookings that are
--      within 12 hours of pickup.
--   4. Ensure return_booking keeps the asset in maintenance when the borrower
--      has already filed a damage report before return verification.
-- ============================================================

CREATE OR REPLACE FUNCTION apply_damage_report_maintenance(p_damage_report_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id      UUID;
  v_asset_name    TEXT;
  v_report_status damage_report_status;
  r               RECORD;
BEGIN
  SELECT dr.asset_id, dr.status, COALESCE(a.name, '设备')
  INTO v_asset_id, v_report_status, v_asset_name
  FROM damage_reports dr
  JOIN assets a ON a.id = dr.asset_id
  WHERE dr.id = p_damage_report_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_report_status NOT IN ('open', 'investigating') THEN
    RETURN;
  END IF;

  UPDATE assets
  SET status = 'maintenance',
      updated_at = now()
  WHERE id = v_asset_id
    AND status <> 'retired';

  FOR r IN
    UPDATE bookings
    SET status = 'suspended',
        rejection_reason = 'ASSET_MAINTENANCE',
        updated_at = now()
    WHERE asset_id = v_asset_id
      AND status IN ('pending', 'approved')
      AND start_date > now()
    RETURNING id, borrower_id, start_date
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata
    )
    VALUES (
      r.borrower_id,
      'booking_suspended',
      '预约已暂停 — 设备维修中',
      format(
        '您预约的「%s」因损坏报告已进入维修流程，预约（取货日：%s）已暂时挂起。设备修复重新上架后会自动恢复；若您不想继续等待，也可以主动取消。',
        v_asset_name,
        to_char(r.start_date AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI')
      ),
      jsonb_build_object(
        'booking_id', r.id,
        'asset_id', v_asset_id,
        'damage_report_id', p_damage_report_id,
        'reason', 'ASSET_MAINTENANCE'
      )
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION sync_damage_report_maintenance_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM apply_damage_report_maintenance(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_damage_report_maintenance_on_insert ON damage_reports;
CREATE TRIGGER sync_damage_report_maintenance_on_insert
  AFTER INSERT ON damage_reports
  FOR EACH ROW
  EXECUTE FUNCTION sync_damage_report_maintenance_on_insert();

CREATE OR REPLACE FUNCTION prevent_relist_with_unresolved_damage_reports()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'available'
    AND COALESCE(OLD.status::text, '') <> 'available'
    AND EXISTS (
      SELECT 1
      FROM damage_reports
      WHERE asset_id = NEW.id
        AND status IN ('open', 'investigating')
    )
  THEN
    RAISE EXCEPTION 'Cannot re-list asset while unresolved damage reports still exist.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_relist_with_unresolved_damage_reports ON assets;
CREATE TRIGGER prevent_relist_with_unresolved_damage_reports
  BEFORE UPDATE OF status ON assets
  FOR EACH ROW
  EXECUTE FUNCTION prevent_relist_with_unresolved_damage_reports();

CREATE OR REPLACE FUNCTION check_suspended_maintenance_bookings()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    UPDATE bookings b
    SET status = 'cancelled',
        rejection_reason = 'ASSET_MAINTENANCE_EXPIRED',
        updated_at = now()
    FROM assets a
    WHERE b.asset_id = a.id
      AND b.status = 'suspended'
      AND b.rejection_reason = 'ASSET_MAINTENANCE'
      AND b.start_date <= now() + INTERVAL '12 hours'
    RETURNING b.id, b.borrower_id, b.asset_id, b.start_date, COALESCE(a.name, '设备') AS asset_name
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata
    )
    VALUES (
      r.borrower_id,
      'booking_cancelled',
      CASE
        WHEN r.start_date <= now() THEN '预约已自动取消'
        ELSE '紧急：预约已自动取消'
      END,
      CASE
        WHEN r.start_date <= now() THEN
          format(
            '您预约的「%s」取货时间已过，设备仍在维修中，预约已自动取消。如仍需借用，请在设备恢复后重新预约。',
            r.asset_name
          )
        ELSE
          format(
            '您预约的「%s」距离取货时间已不足 12 小时，但设备仍处于维修状态，预约已自动取消。若后续仍需借用，请等待设备恢复后重新预约。',
            r.asset_name
          )
      END,
      jsonb_build_object(
        'booking_id', r.id,
        'asset_id', r.asset_id,
        'reason', 'ASSET_MAINTENANCE_EXPIRED'
      )
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION check_suspended_maintenance_bookings() TO authenticated;

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

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id
    FROM damage_reports
    WHERE status IN ('open', 'investigating')
  LOOP
    PERFORM apply_damage_report_maintenance(r.id);
  END LOOP;
END;
$$;

-- ============================================================
-- END OF MIGRATION 025
-- ============================================================
