-- ============================================================
-- UniGear: Ensure withdrawing a damage report also clears compensation
-- 校园资产管理系统 — 撤回损坏/丢失报告时同步清理赔偿单
-- Migration: 032_fix_withdraw_damage_report_compensation_cleanup.sql
-- Date: 2026-03-30
--
-- Purpose:
--   1. Make withdraw_own_damage_report() clear the linked compensation case
--      even if the compensation sync trigger was missing or failed.
--   2. Keep student-facing compensation screens from showing stale amounts
--      after the reporter withdraws the case.
-- ============================================================

CREATE OR REPLACE FUNCTION withdraw_own_damage_report(p_report_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report damage_reports%ROWTYPE;
  v_note TEXT;
  v_case_id UUID;
BEGIN
  SELECT *
  INTO v_report
  FROM damage_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Damage report not found: %', p_report_id;
  END IF;

  IF v_report.reporter_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the original reporter can withdraw this damage report';
  END IF;

  IF v_report.status NOT IN ('open', 'investigating') THEN
    RAISE EXCEPTION 'This damage report can no longer be withdrawn';
  END IF;

  v_note := trim(BOTH FROM concat_ws(E'\n', NULLIF(v_report.resolution_notes, ''), '[System] Withdrawn by reporter before admin review.'));

  UPDATE damage_reports
  SET status = 'dismissed',
      resolution_notes = v_note,
      updated_at = now()
  WHERE id = p_report_id;

  UPDATE compensation_cases
  SET status = 'waived',
      assessed_amount = 0,
      agreed_amount = 0,
      due_date = NULL,
      updated_at = now()
  WHERE damage_report_id = p_report_id
  RETURNING id INTO v_case_id;

  IF v_case_id IS NOT NULL THEN
    INSERT INTO compensation_records (
      compensation_case_id,
      record_type,
      title,
      description,
      amount,
      created_by
    )
    VALUES (
      v_case_id,
      'adjustment',
      'Compensation waived after report withdrawal',
      'The original reporter withdrew the damage report before final confirmation, so the compensation flow was cleared automatically.',
      0,
      auth.uid()
    );
  END IF;

  PERFORM restore_booking_and_asset_after_damage_clearance(
    v_report.booking_id,
    v_report.asset_id,
    v_report.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION withdraw_own_damage_report(UUID) TO authenticated;

-- ============================================================
-- END OF MIGRATION 032
-- ============================================================
