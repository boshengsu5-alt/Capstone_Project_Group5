-- ============================================================
-- UniGear: Allow Admins to Manage User Profiles
-- 校园资产管理系统 — 允许管理员管理任意用户资料
-- Migration: 023_admin_profile_update_policy.sql
-- Date: 2026-03-29
--
-- Problem:
--   The original profiles_update_own RLS policy only allows a user to update
--   their own row. The admin dashboard edits other users' roles / credit
--   scores, so those UPDATEs are silently blocked by RLS.
--
-- 问题：
--   profiles_update_own 只允许用户修改自己的资料行。管理员后台在编辑其他
--   用户的角色 / 信用分时，请求会被 RLS 静默拦截，前端看起来像“保存成功”，
--   但刷新后数据不会保留。
--
-- Solution:
--   Add an explicit admin-only UPDATE policy on profiles so authenticated
--   admins can update any profile row.
--
-- 解决方案：
--   为 profiles 表补充一条仅 admin 可用的 UPDATE 策略，允许管理员更新任意
--   用户资料。
--
-- Rollback:
--   DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
-- ============================================================

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- END OF MIGRATION 023
-- ============================================================
