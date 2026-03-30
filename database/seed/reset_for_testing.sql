-- ============================================================
-- UniGear — Test Environment Reset Script
-- UniGear 测试环境重置脚本
--
-- Purpose: Clear all transactional data while keeping assets,
--          categories, and user accounts intact.
-- 目的：清除所有事务性数据，保留资产、分类和用户账号。
--
-- Run in: Supabase Dashboard → SQL Editor (runs as superuser,
--         bypasses RLS automatically)
-- 运行方式：Supabase 控制台 → SQL Editor（以超级用户身份运行，自动绕过 RLS）
--
-- What is DELETED:
--   - review_replies      评价回复
--   - reviews             评价
--   - credit_score_logs   信用分变动记录
--   - compensation_records 赔偿明细
--   - compensation_cases  赔偿案例
--   - damage_reports      损坏报告
--   - notifications       通知
--   - audit_logs          审计日志
--   - bookings            借用记录
--
-- What is RESET (not deleted):
--   - assets.status       → 'available'
--   - assets.is_archived  → false
--   - profiles.credit_score → 100
--
-- What is KEPT UNCHANGED:
--   - assets (name, condition, location, etc.)
--   - categories
--   - profiles (accounts, roles)
-- ============================================================

BEGIN;

-- Step 1: 删除有依赖关系的子表，顺序从最末端开始
-- Delete child tables first (deepest dependencies first)

DELETE FROM public.review_replies;
DELETE FROM public.reviews;
DELETE FROM public.credit_score_logs;
DELETE FROM public.compensation_records;
DELETE FROM public.compensation_cases;
DELETE FROM public.damage_reports;
DELETE FROM public.notifications;
DELETE FROM public.audit_logs;

-- Step 2: 删除主借用记录（外键都已清除，可安全删除）
-- Delete bookings (all foreign keys cleared above, safe to delete now)
DELETE FROM public.bookings;

-- Step 3: 重置所有资产为初始可用状态
-- Reset all assets to initial available state
UPDATE public.assets
SET
    status      = 'available',
    is_archived = false,
    updated_at  = NOW();

-- Step 4: 重置所有用户信用分为默认值 100
-- Reset all user credit scores to default value 100
UPDATE public.profiles
SET
    credit_score = 100,
    updated_at   = NOW();

COMMIT;

-- ============================================================
-- Verification queries — run these after the reset to confirm
-- 验证查询 — 重置后运行以确认结果
-- ============================================================

-- SELECT COUNT(*) AS bookings_remaining   FROM public.bookings;
-- SELECT COUNT(*) AS damage_reports_remaining FROM public.damage_reports;
-- SELECT COUNT(*) AS audit_logs_remaining  FROM public.audit_logs;
-- SELECT COUNT(*) AS assets_available, COUNT(*) FILTER (WHERE status != 'available') AS not_available
--   FROM public.assets;
-- SELECT COUNT(*) AS users_reset, AVG(credit_score) AS avg_credit
--   FROM public.profiles;
