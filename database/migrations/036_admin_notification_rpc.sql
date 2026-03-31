-- ============================================================
-- UniGear: Admin Notification RPC
-- 校园资产管理系统 — 管理员通知发送 RPC
-- Migration: 036_admin_notification_rpc.sql
-- Date: 2026-03-31
--
-- Rollback:
--   DROP FUNCTION IF EXISTS notify_admin_users(notification_type, text, text, jsonb);
-- ============================================================

CREATE OR REPLACE FUNCTION notify_admin_users(
  p_type notification_type,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count integer := 0;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, metadata)
  SELECT
    p.id,
    p_type,
    p_title,
    COALESCE(p_message, ''),
    COALESCE(p_metadata, '{}'::jsonb)
  FROM profiles p
  WHERE p.role IN ('admin', 'staff');

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION notify_admin_users(notification_type, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION notify_admin_users(notification_type, text, text, jsonb) TO authenticated;

-- ============================================================
-- END OF MIGRATION 036
-- ============================================================
