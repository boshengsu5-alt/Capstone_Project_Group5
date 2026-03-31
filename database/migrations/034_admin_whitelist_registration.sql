-- ============================================================
-- UniGear: Admin Whitelist Registration Support
-- 校园资产管理系统 — 管理员白名单注册支持
-- Migration: 034_admin_whitelist_registration.sql
-- Date: 2026-03-31
--
-- Rollback:
--   DROP FUNCTION IF EXISTS verify_admin_registration_identity(text, text);
--   ALTER TABLE admin_whitelist DROP COLUMN IF EXISTS role;
-- ============================================================

ALTER TABLE admin_whitelist
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'staff';

UPDATE admin_whitelist
SET role = CASE
  WHEN lower(email) = 'admin@centria.fi' THEN 'admin'::user_role
  ELSE 'staff'::user_role
END
WHERE lower(email) IN (
  'admin@centria.fi',
  'librarian@centria.fi',
  'it.support@centria.fi'
);

CREATE OR REPLACE FUNCTION verify_admin_registration_identity(
  p_email text,
  p_full_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  whitelist_row admin_whitelist%ROWTYPE;
BEGIN
  SELECT *
  INTO whitelist_row
  FROM admin_whitelist
  WHERE lower(email) = lower(trim(p_email));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'whitelist_not_found');
  END IF;

  IF lower(trim(whitelist_row.full_name)) <> lower(trim(p_full_name)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'name_mismatch');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'full_name', whitelist_row.full_name,
    'role', whitelist_row.role
  );
END;
$$;

REVOKE ALL ON FUNCTION verify_admin_registration_identity(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_admin_registration_identity(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_email text := trim(COALESCE(NEW.email, ''));
  v_full_name text := trim(COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  v_requested_student_id text := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'student_id', '')), '');
  v_verified_student_id text := NULL;
  v_verified_department text := '';
  whitelist_row admin_whitelist%ROWTYPE;
  roster_row student_roster%ROWTYPE;
BEGIN
  SELECT *
  INTO whitelist_row
  FROM admin_whitelist
  WHERE lower(email) = lower(v_email);

  IF FOUND THEN
    INSERT INTO profiles (id, email, full_name, student_id, department, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      whitelist_row.full_name,
      NULL,
      '',
      whitelist_row.role
    );

    RETURN NEW;
  END IF;

  IF v_requested_student_id IS NOT NULL AND v_full_name <> '' THEN
    SELECT *
    INTO roster_row
    FROM student_roster
    WHERE student_id = v_requested_student_id;

    IF FOUND
      AND lower(trim(roster_row.full_name)) = lower(v_full_name)
      AND (NOT roster_row.is_registered OR roster_row.user_id = NEW.id) THEN
      v_verified_student_id := roster_row.student_id;
      v_verified_department := roster_row.department;

      UPDATE student_roster
      SET is_registered = true,
          registered_at = COALESCE(registered_at, now()),
          user_id = NEW.id
      WHERE student_id = roster_row.student_id
        AND (user_id IS NULL OR user_id = NEW.id);
    END IF;
  END IF;

  INSERT INTO profiles (id, email, full_name, student_id, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    v_full_name,
    v_verified_student_id,
    v_verified_department
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
