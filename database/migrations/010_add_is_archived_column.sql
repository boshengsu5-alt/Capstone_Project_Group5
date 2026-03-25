-- ============================================================
-- Migration: 010_add_is_archived_column.sql
-- Description: Add is_archived boolean for logical deletion.
-- This is more robust than altering an existing enum.
-- ============================================================

ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Index for performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_assets_is_archived ON assets(is_archived) WHERE is_archived = false;

COMMENT ON COLUMN assets.is_archived IS 'Flag for logical deletion (soft delete)';
