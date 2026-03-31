-- ============================================================
-- UniGear: Lock Profile Roles to Admin Whitelist
-- 校园资产管理系统 — 将后台角色锁定为白名单同步结果
-- Migration: 035_lock_profile_role_management.sql
-- Date: 2026-03-31
--
-- Rollback:
--   DROP TRIGGER IF EXISTS sync_profiles_from_admin_whitelist ON admin_whitelist;
--   DROP FUNCTION IF EXISTS sync_profiles_from_admin_whitelist();
--   DROP FUNCTION IF EXISTS sync_profile_role_from_whitelist_email(text);
--   -- Then restore prevent_role_escalation() from 008 if needed.
-- ============================================================

-- Sync one profile role from the current whitelist snapshot.
CREATE OR REPLACE FUNCTION sync_profile_role_from_whitelist_email(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.role_sync', 'admin_whitelist', true);

  UPDATE profiles
  SET role = COALESCE(
    (
      SELECT aw.role
      FROM admin_whitelist aw
      WHERE lower(aw.email) = lower(trim(p_email))
      LIMIT 1
    ),
    'student'::user_role
  )
  WHERE lower(email) = lower(trim(p_email));
END;
$$;

-- Backfill all existing profile roles so only whitelist-backed accounts remain admin/staff.
UPDATE profiles p
SET role = COALESCE(
  (
    SELECT aw.role
    FROM admin_whitelist aw
    WHERE lower(aw.email) = lower(p.email)
    LIMIT 1
  ),
  'student'::user_role
)
WHERE p.role IS DISTINCT FROM COALESCE(
  (
    SELECT aw.role
    FROM admin_whitelist aw
    WHERE lower(aw.email) = lower(p.email)
    LIMIT 1
  ),
  'student'::user_role
);

-- Keep profiles.role synced when whitelist rows are inserted, updated, or removed.
CREATE OR REPLACE FUNCTION sync_profiles_from_admin_whitelist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM sync_profile_role_from_whitelist_email(OLD.email);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM sync_profile_role_from_whitelist_email(NEW.email);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_profiles_from_admin_whitelist ON admin_whitelist;
CREATE TRIGGER sync_profiles_from_admin_whitelist
AFTER INSERT OR UPDATE OR DELETE ON admin_whitelist
FOR EACH ROW
EXECUTE FUNCTION sync_profiles_from_admin_whitelist();

-- Lock direct profile role edits from normal authenticated clients.
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.role() = 'authenticated'
       AND current_setting('app.role_sync', true) IS DISTINCT FROM 'admin_whitelist' THEN
      NEW.role := OLD.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- END OF MIGRATION 035
-- ============================================================
