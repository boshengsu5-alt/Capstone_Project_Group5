-- ============================================================
-- UniGear: Production Security Hardening
-- 校园资产管理系统 — 生产环境安全加固
-- Migration: 008_production_security.sql
-- Date: 2026-03-19 (Day 13)
-- Author: Bosheng
--
-- 计划书 Day 13 要求："关闭 Supabase 的所有匿名读写权限，
-- 将 RLS 调至最严格的生产模式"
--
-- Rollback:
--   1. Re-create anon policies from 002_public_read_policies.sql
--   2. Re-grant anon SELECT on assets, categories
--   3. Drop the new restrictive profiles update policy and
--      re-create the original profiles_update_own policy
-- ============================================================

-- ============================================================
-- 1. REVOKE ANONYMOUS ACCESS — 撤销匿名访问
-- 生产环境不允许未登录用户浏览任何数据
-- ============================================================

-- 撤销 004 中授予 anon 的表级别权限
REVOKE SELECT ON assets FROM anon;
REVOKE SELECT ON categories FROM anon;

-- 删除 002 中创建的 anon RLS 策略
DROP POLICY IF EXISTS "Allow public read-only access to assets" ON assets;
DROP POLICY IF EXISTS "Allow public read-only access to categories" ON categories;

-- ============================================================
-- 2. PREVENT ROLE ESCALATION — 防止角色提权攻击
-- 原 profiles_update_own 策略允许用户修改自己的任意字段，
-- 包括 role 字段！学生可以把自己改成 admin，这是致命漏洞。
-- 解决方案：用触发器拦截 role 字段的非法修改
-- ============================================================

-- 创建触发器函数：如果非 admin 用户试图修改 role，直接还原
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果 role 字段被修改
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- 检查当前操作者是否为 admin
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      -- 非 admin 用户不允许修改 role，静默还原
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER guard_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- ============================================================
-- 3. PREVENT CREDIT SCORE TAMPERING — 防止信用分篡改
-- 学生不应该能直接修改自己的 credit_score
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_credit_tampering()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果 credit_score 被修改
  IF NEW.credit_score IS DISTINCT FROM OLD.credit_score THEN
    -- 检查当前操作者是否为 admin/staff
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    ) THEN
      -- 非管理员不允许直接修改信用分，静默还原
      -- （信用分变更只能通过 SECURITY DEFINER 的 RPC 函数）
      NEW.credit_score := OLD.credit_score;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER guard_credit_tampering
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_credit_tampering();

-- ============================================================
-- 4. RESTRICT DELETE OPERATIONS — 限制删除操作
-- 生产环境中，关键业务数据不应被随意删除
-- ============================================================

-- 借用记录不允许删除（只能改状态）
-- bookings 表没有 DELETE 的 GRANT，已经安全，但显式确认
REVOKE DELETE ON bookings FROM authenticated;

-- 损坏报告不允许删除
REVOKE DELETE ON damage_reports FROM authenticated;

-- 通知不允许删除（只标记已读）
REVOKE DELETE ON notifications FROM authenticated;

-- 评价不允许删除
REVOKE DELETE ON reviews FROM authenticated;

-- 审计日志永不可删（不可篡改的操作留痕）
REVOKE DELETE ON audit_logs FROM authenticated;
REVOKE UPDATE ON audit_logs FROM authenticated;

-- ============================================================
-- 5. TIGHTEN BOOKINGS UPDATE — 收紧借用更新策略
-- 学生只能取消自己 pending/approved 状态的借用，不能修改其他字段
-- ============================================================

-- 创建触发器：学生只能将 status 改为 cancelled，且仅限 pending/approved
CREATE OR REPLACE FUNCTION restrict_booking_update()
RETURNS TRIGGER AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- 管理员不受限制
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ) INTO is_admin;

  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- 学生只能执行：pending/approved → cancelled
  IF OLD.status IN ('pending', 'approved') AND NEW.status = 'cancelled' THEN
    -- 只允许修改 status 和 updated_at，其他字段还原
    NEW.asset_id := OLD.asset_id;
    NEW.borrower_id := OLD.borrower_id;
    NEW.approver_id := OLD.approver_id;
    NEW.start_date := OLD.start_date;
    NEW.end_date := OLD.end_date;
    NEW.actual_return_date := OLD.actual_return_date;
    NEW.pickup_photo_url := OLD.pickup_photo_url;
    NEW.return_photo_url := OLD.return_photo_url;
    NEW.notes := OLD.notes;
    NEW.rejection_reason := OLD.rejection_reason;
    RETURN NEW;
  END IF;

  -- 其他修改操作被 SECURITY DEFINER RPC 函数执行，
  -- RPC 以 owner 身份运行，不会触发 RLS 检查
  -- 但如果学生试图直接 UPDATE 其他状态，阻止
  RAISE EXCEPTION '无权修改此借用记录的状态';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER guard_booking_update
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION restrict_booking_update();

-- ============================================================
-- 6. ENFORCE HTTPS-ONLY STORAGE — Storage 安全提示
-- ============================================================
-- 注意：以下 Storage 安全设置需在 Supabase Dashboard 手动操作：
-- 1. asset-images bucket: 设为 public（只读），禁止 anon 上传
-- 2. returns bucket: 设为 private，仅 authenticated 可上传
-- 3. damage-photos bucket: 设为 private，仅 authenticated 可上传
-- 4. 检查 Storage RLS 策略，确保用户只能上传到自己的路径下

-- ============================================================
-- END OF MIGRATION 008
-- ============================================================
