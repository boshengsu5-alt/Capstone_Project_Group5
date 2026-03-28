-- ============================================================
-- UniGear: Credit Score Change Log Table
-- 校园资产管理系统 — 信用分变动日志表
-- Migration: 021_credit_score_logs.sql
-- Date: 2026-03-28
--
-- Purpose: Track every credit score change (both deductions and bonuses)
-- so users can view their full credit score history in the mobile app.
-- 目的：记录每次信用分变动（扣分和加分），让用户可以在 App 中查看历史明细。
--
-- Rollback:
--   DROP TABLE IF EXISTS public.credit_score_logs;
-- ============================================================

CREATE TABLE IF NOT EXISTS public.credit_score_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- 变化量：负数为扣分（如 -5, -20），正数为加分（如 +5）
    delta        INTEGER NOT NULL,
    -- 本次变动后的信用分余额（用于前端直接展示，无需再计算）
    balance_after INTEGER NOT NULL,
    -- 变动原因代码，对应前端 i18n key（如 overdue_7days, return_bonus, damage_severe）
    reason       TEXT NOT NULL,
    -- 关联的借用单 ID（可为空，系统操作时无关联借用）
    booking_id   UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- RLS：用户只能查自己的信用分日志，管理员可查所有
-- ============================================================
ALTER TABLE public.credit_score_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能读自己的记录
CREATE POLICY "Users can read own credit score logs"
ON public.credit_score_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 管理员/员工可读全部记录（审计用途）
CREATE POLICY "Admins and staff can read all credit score logs"
ON public.credit_score_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
);

-- 仅允许 SECURITY DEFINER 函数（以 postgres 超级用户身份）写入，
-- 普通客户端不得直接插入，通过 WITH CHECK (false) 拦截
CREATE POLICY "Only system functions can insert credit score logs"
ON public.credit_score_logs FOR INSERT
TO authenticated
WITH CHECK (false);

-- ============================================================
-- Indexes for performance
-- 索引：按用户 + 时间倒序查询是最常见的访问模式
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_credit_score_logs_user_created
  ON public.credit_score_logs(user_id, created_at DESC);

-- ============================================================
-- Permissions
-- 授权：authenticated 角色可 SELECT，INSERT 由 SECURITY DEFINER 函数代为执行
-- ============================================================
GRANT SELECT ON public.credit_score_logs TO authenticated;

-- ============================================================
-- END OF MIGRATION 021
-- ============================================================
