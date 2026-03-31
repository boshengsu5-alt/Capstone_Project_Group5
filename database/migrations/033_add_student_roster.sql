-- ============================================================
-- UniGear: Student Roster and Admin Whitelist
-- 校园资产管理系统 — 学生花名册与管理员白名单
-- Migration: 033_add_student_roster.sql
-- Date: 2026-03-31
--
-- Rollback:
--   DROP FUNCTION IF EXISTS mark_student_registered(text, uuid);
--   DROP FUNCTION IF EXISTS verify_admin_identity(text);
--   DROP FUNCTION IF EXISTS verify_student_identity(text, text);
--   DROP TABLE IF EXISTS admin_whitelist;
--   DROP TABLE IF EXISTS student_roster;
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS student_roster (
  student_id text PRIMARY KEY,
  full_name text NOT NULL,
  department text NOT NULL,
  enrollment_year int NOT NULL,
  is_registered boolean NOT NULL DEFAULT false,
  registered_at timestamptz NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS student_roster_user_id_unique
  ON student_roster(user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin_whitelist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_whitelist_email_lower_unique
  ON admin_whitelist (lower(email));

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE student_roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_roster_service_role_all" ON student_roster;
CREATE POLICY "student_roster_service_role_all" ON student_roster
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "student_roster_select_own" ON student_roster;
CREATE POLICY "student_roster_select_own" ON student_roster
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE admin_whitelist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_whitelist_service_role_all" ON admin_whitelist;
CREATE POLICY "admin_whitelist_service_role_all" ON admin_whitelist
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON student_roster TO authenticated;
GRANT ALL ON student_roster TO service_role;
GRANT ALL ON admin_whitelist TO service_role;

-- ============================================================
-- 3. RPC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION verify_student_identity(
  p_student_id text,
  p_full_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  roster_row student_roster%ROWTYPE;
BEGIN
  SELECT *
  INTO roster_row
  FROM student_roster
  WHERE student_id = trim(p_student_id);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'student_not_found');
  END IF;

  IF lower(trim(roster_row.full_name)) <> lower(trim(p_full_name)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'name_mismatch');
  END IF;

  IF roster_row.is_registered THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_registered');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'department', roster_row.department,
    'enrollment_year', roster_row.enrollment_year
  );
END;
$$;

REVOKE ALL ON FUNCTION verify_student_identity(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_student_identity(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION verify_admin_identity(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admin_whitelist
    WHERE lower(email) = lower(trim(p_email))
  );
END;
$$;

REVOKE ALL ON FUNCTION verify_admin_identity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_admin_identity(text) TO authenticated;

CREATE OR REPLACE FUNCTION mark_student_registered(
  p_student_id text,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE student_roster
  SET is_registered = true,
      registered_at = COALESCE(registered_at, now()),
      user_id = p_user_id
  WHERE student_id = trim(p_student_id)
    AND (user_id IS NULL OR user_id = p_user_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_not_found_or_already_bound';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION mark_student_registered(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_student_registered(text, uuid) TO authenticated;

-- ============================================================
-- 4. SIGN-UP PROFILE ENRICHMENT
-- 兼容邮箱验证模式：通过 auth metadata 自动回填 profile，并尝试标记花名册
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name text := trim(COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  v_requested_student_id text := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'student_id', '')), '');
  v_verified_student_id text := NULL;
  v_verified_department text := '';
  roster_row student_roster%ROWTYPE;
BEGIN
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
