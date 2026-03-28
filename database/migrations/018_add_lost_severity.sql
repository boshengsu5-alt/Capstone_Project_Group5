-- ============================================================
-- UniGear: Add 'lost' to damage_severity enum type
-- 资产管理系统 — 损坏严重程度枚举新增"设备丢失"
-- Migration: 018_add_lost_severity.sql
-- Date: 2026-03-28
-- Author: Bosheng
--
-- 注意：severity 列是 PostgreSQL 原生 ENUM 类型（damage_severity），
--       不是 text + CHECK 约束，必须用 ALTER TYPE ADD VALUE 来扩展。
--
-- Rollback（PostgreSQL 不支持从 ENUM 删除值，需重建类型，较复杂）:
--   -- 如需回滚，联系 Supabase 支持或通过数据库快照恢复
-- ============================================================

-- 向 damage_severity 枚举类型新增 'lost' 值
-- IF NOT EXISTS 防止重复执行报错
ALTER TYPE damage_severity ADD VALUE IF NOT EXISTS 'lost';

-- ============================================================
-- END OF MIGRATION 018
-- ============================================================
