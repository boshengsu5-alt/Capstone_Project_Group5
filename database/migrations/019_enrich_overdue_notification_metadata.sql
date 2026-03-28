-- ============================================================
-- UniGear: Enrich overdue notifications with asset / days / penalty metadata
-- 校园资产管理系统 — 为逾期通知补充设备名、逾期天数和扣分信息
-- Migration: 019_enrich_overdue_notification_metadata.sql
-- Date: 2026-03-28
-- ============================================================

CREATE OR REPLACE FUNCTION check_overdue_bookings()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_penalty INTEGER := 10;
  v_overdue_days INTEGER;
  v_asset_name TEXT;
BEGIN
  FOR r IN
    SELECT
      b.id,
      b.asset_id,
      b.borrower_id,
      b.end_date,
      a.name AS asset_name
    FROM bookings b
    LEFT JOIN assets a ON a.id = b.asset_id
    WHERE b.status = 'active'
      AND b.end_date < now()
  LOOP
    v_asset_name := COALESCE(r.asset_name, 'Asset');
    v_overdue_days := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (now() - r.end_date)) / 86400.0)::INTEGER
    );

    UPDATE bookings
    SET status = 'overdue',
        updated_at = now()
    WHERE id = r.id;

    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      r.borrower_id,
      'overdue_alert',
      'Overdue return penalty notice',
      format(
        'Your booking for "%s" is overdue by %s day(s). 10 credit points have already been deducted. Please return the asset as soon as possible to avoid further penalties.',
        v_asset_name,
        v_overdue_days
      ),
      jsonb_build_object(
        'booking_id', r.id,
        'asset_id', r.asset_id,
        'asset_name', v_asset_name,
        'overdue_days', v_overdue_days,
        'penalty', v_penalty,
        'credit_delta', -v_penalty
      )
    );

    PERFORM update_credit_score(r.borrower_id, -v_penalty, 'overdue_booking');
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION check_overdue_bookings() TO authenticated;
