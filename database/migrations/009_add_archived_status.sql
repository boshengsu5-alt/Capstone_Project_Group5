-- ============================================================
-- Migration: 009_add_archived_status.sql
-- Description: Add 'archived' to asset_status enum for logical deletion.
-- Date: 2026-03-26
-- ============================================================

-- Alter the asset_status enum to include 'archived'
-- Note: In Postgres, you can't easily remove values from an enum, but you can add them.
ALTER TYPE asset_status ADD VALUE 'archived';

COMMENT ON TYPE asset_status IS 'Asset availability status (archived used for soft deletion)';
