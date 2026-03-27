-- ============================================================
-- UniGear: Allow students to edit their own pending damage report
-- 校园资产管理系统 — 允许学生编辑自己尚未结案的损坏报告
-- Migration: 016_update_own_damage_report.sql
-- Date: 2026-03-27
-- ============================================================

CREATE OR REPLACE FUNCTION update_own_damage_report(
  p_report_id UUID,
  p_description TEXT,
  p_severity damage_severity,
  p_photo_urls TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter_id UUID;
  v_status damage_report_status;
BEGIN
  SELECT reporter_id, status
  INTO v_reporter_id, v_status
  FROM damage_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Damage report not found: %', p_report_id;
  END IF;

  IF v_reporter_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the original reporter can edit this damage report';
  END IF;

  IF v_status NOT IN ('open', 'investigating') THEN
    RAISE EXCEPTION 'This damage report can no longer be edited';
  END IF;

  UPDATE damage_reports
  SET description = p_description,
      severity = p_severity,
      photo_urls = p_photo_urls,
      updated_at = now()
  WHERE id = p_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_own_damage_report(UUID, TEXT, damage_severity, TEXT[]) TO authenticated;
