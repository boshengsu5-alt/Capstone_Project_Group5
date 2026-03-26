-- ============================================================
-- UniGear: Fix prevent_credit_tampering trigger
-- 校园资产管理系统 — 修复信用分防篡改触发器
-- Migration: 012_fix_credit_tampering_trigger.sql
-- Date: 2026-03-25
-- Author: Web Team
--
-- Problem: The prevent_credit_tampering trigger uses auth.uid() to check
-- if the caller is admin/staff. However, inside SECURITY DEFINER functions
-- (like update_credit_score and return_booking), auth.uid() returns NULL
-- because the JWT context is lost when running as the postgres superuser.
-- This causes NOT EXISTS to always be TRUE, silently reverting ALL credit
-- score changes — including legitimate deductions and return bonuses.
--
-- 问题：prevent_credit_tampering 触发器使用 auth.uid() 检查调用者是否为
-- 管理员。但在 SECURITY DEFINER 函数（如 update_credit_score、return_booking）
-- 内部执行时，auth.uid() 返回 NULL（以 postgres 超级用户身份运行时 JWT 上下文
-- 丢失）。导致 NOT EXISTS 始终为 TRUE，悄悄撤销所有信用分变更。
--
-- Fix: Check current_user to detect SECURITY DEFINER context.
-- If current_user is not 'authenticated' or 'anon', the change comes from
-- a trusted SECURITY DEFINER function and should be allowed.
--
-- 修复：检查 current_user 判断是否在 SECURITY DEFINER 上下文中。
-- 若 current_user 不是 'authenticated' 或 'anon'，说明变更来自受信任的
-- SECURITY DEFINER 函数，允许通过。
--
-- Rollback:
--   Re-apply the original prevent_credit_tampering from 008_production_security.sql
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_credit_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.credit_score IS DISTINCT FROM OLD.credit_score THEN

    -- SECURITY DEFINER 函数（update_credit_score、return_booking 等）以
    -- postgres 超级用户身份运行，current_user 不是 'authenticated'/'anon'。
    -- 这些函数是唯一被授权修改信用分的途径，直接放行。
    IF current_user NOT IN ('authenticated', 'anon') THEN
      RETURN NEW;
    END IF;

    -- 直接客户端请求：只有管理员/员工才能修改信用分
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    ) THEN
      -- 非管理员直接修改信用分，静默还原
      NEW.credit_score := OLD.credit_score;
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- END OF MIGRATION 012
-- ============================================================
