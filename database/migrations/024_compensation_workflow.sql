-- ============================================================
-- UniGear: Compensation Workflow
-- 校园资产管理系统 — 赔偿流程与记录
-- Migration: 024_compensation_workflow.sql
-- Date: 2026-03-29
--
-- Purpose:
--   1. 为损坏报告建立正式的赔偿主档（compensation_cases）
--   2. 记录每一次评估 / 签字 / 付款 / 调整明细（compensation_records）
--   3. 为现有 damage_reports 回填赔偿档案
--   4. 增加 compensation_update 通知类型，供手机端 / 网页端流程提醒
--
-- 目的：
--   1. 给 damage_reports 配套正式赔偿流程
--   2. 能记录每一步赔偿处理明细
--   3. 回填历史损坏报告，避免老数据无赔偿页可看
--   4. 提供新的赔偿通知类型
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'booking_pending';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'return_submitted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'booking_suspended';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'booking_restored';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'booking_cancelled';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'compensation_update';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compensation_status') THEN
    CREATE TYPE compensation_status AS ENUM (
      'under_review',
      'awaiting_signature',
      'awaiting_payment',
      'partially_paid',
      'paid',
      'waived'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compensation_record_type') THEN
    CREATE TYPE compensation_record_type AS ENUM (
      'assessment',
      'status_update',
      'signature',
      'payment',
      'adjustment',
      'note'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION estimate_damage_compensation(
  p_asset_id UUID,
  p_booking_id UUID,
  p_reporter_id UUID,
  p_severity damage_severity,
  p_auto_generated BOOLEAN,
  p_report_status damage_report_status
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_purchase_price NUMERIC;
  v_purchase_date TIMESTAMPTZ;
  v_borrower_id UUID;
  v_years NUMERIC;
  v_depreciation NUMERIC;
  v_coefficient NUMERIC;
BEGIN
  IF p_report_status = 'dismissed' THEN
    RETURN 0;
  END IF;

  SELECT a.purchase_price, a.purchase_date, b.borrower_id
  INTO v_purchase_price, v_purchase_date, v_borrower_id
  FROM assets a
  JOIN bookings b ON b.id = p_booking_id
  WHERE a.id = p_asset_id;

  IF v_purchase_price IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_purchase_date IS NULL THEN
    v_depreciation := 0.5;
  ELSE
    v_years := EXTRACT(EPOCH FROM (now() - v_purchase_date)) / (60 * 60 * 24 * 365.25);
    IF v_years <= 1 THEN
      v_depreciation := 1.0;
    ELSIF v_years <= 3 THEN
      v_depreciation := 0.8;
    ELSIF v_years <= 5 THEN
      v_depreciation := 0.5;
    ELSE
      v_depreciation := 0.2;
    END IF;
  END IF;

  IF p_severity = 'lost' THEN
    IF NOT p_auto_generated AND p_reporter_id = v_borrower_id THEN
      RETURN round(v_purchase_price * v_depreciation, 2);
    END IF;
    RETURN round(v_purchase_price, 2);
  END IF;

  v_coefficient := CASE p_severity
    WHEN 'minor' THEN 0.2
    WHEN 'moderate' THEN 0.5
    WHEN 'severe' THEN 1.0
    ELSE 0.5
  END;

  RETURN round(v_purchase_price * v_depreciation * v_coefficient, 2);
END;
$$;

CREATE TABLE IF NOT EXISTS compensation_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  damage_report_id UUID NOT NULL UNIQUE REFERENCES damage_reports(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  liable_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status compensation_status NOT NULL DEFAULT 'under_review',
  assessed_amount NUMERIC(10, 2),
  agreed_amount NUMERIC(10, 2),
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'CNY',
  payment_reference TEXT NOT NULL DEFAULT '',
  due_date TIMESTAMPTZ,
  contact_person TEXT NOT NULL DEFAULT 'Campus Asset Service Desk',
  contact_email TEXT NOT NULL DEFAULT 'assets-office@unigear.edu',
  contact_phone TEXT NOT NULL DEFAULT '+358 40 123 4567',
  contact_office TEXT NOT NULL DEFAULT 'A102 Asset Service Office',
  office_hours TEXT NOT NULL DEFAULT 'Mon-Fri 09:00-16:00',
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compensation_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compensation_case_id UUID NOT NULL REFERENCES compensation_cases(id) ON DELETE CASCADE,
  record_type compensation_record_type NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(10, 2),
  payment_method TEXT NOT NULL DEFAULT '',
  reference_no TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compensation_cases_user ON compensation_cases(liable_user_id);
CREATE INDEX IF NOT EXISTS idx_compensation_cases_status ON compensation_cases(status);
CREATE INDEX IF NOT EXISTS idx_compensation_cases_report ON compensation_cases(damage_report_id);
CREATE INDEX IF NOT EXISTS idx_compensation_records_case_created
  ON compensation_records(compensation_case_id, created_at DESC);

CREATE TRIGGER set_compensation_cases_updated_at
  BEFORE UPDATE ON compensation_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE compensation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compensation_cases_select" ON compensation_cases
  FOR SELECT TO authenticated
  USING (
    liable_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "compensation_cases_update_admin" ON compensation_cases
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "compensation_records_select" ON compensation_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM compensation_cases cc
      WHERE cc.id = compensation_case_id
        AND (
          cc.liable_user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
        )
    )
  );

CREATE POLICY "compensation_records_insert_admin" ON compensation_records
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

GRANT SELECT, UPDATE ON compensation_cases TO authenticated;
GRANT SELECT, INSERT ON compensation_records TO authenticated;

INSERT INTO compensation_cases (
  damage_report_id,
  booking_id,
  asset_id,
  liable_user_id,
  status,
  assessed_amount,
  agreed_amount,
  paid_amount,
  payment_reference,
  due_date
)
SELECT
  dr.id,
  dr.booking_id,
  dr.asset_id,
  b.borrower_id,
  CASE
    WHEN dr.status = 'dismissed' THEN 'waived'::compensation_status
    WHEN dr.status = 'resolved' AND estimate_damage_compensation(dr.asset_id, dr.booking_id, dr.reporter_id, dr.severity, COALESCE(dr.auto_generated, false), dr.status) > 0
      THEN 'awaiting_signature'::compensation_status
    WHEN dr.status = 'resolved' THEN 'waived'::compensation_status
    ELSE 'under_review'::compensation_status
  END,
  estimate_damage_compensation(dr.asset_id, dr.booking_id, dr.reporter_id, dr.severity, COALESCE(dr.auto_generated, false), dr.status),
  CASE
    WHEN dr.status = 'dismissed' THEN 0
    ELSE estimate_damage_compensation(dr.asset_id, dr.booking_id, dr.reporter_id, dr.severity, COALESCE(dr.auto_generated, false), dr.status)
  END,
  0,
  'CMP-' || upper(substr(replace(dr.id::text, '-', ''), 1, 8)),
  CASE
    WHEN dr.status = 'resolved' THEN now() + interval '7 days'
    ELSE NULL
  END
FROM damage_reports dr
JOIN bookings b ON b.id = dr.booking_id
LEFT JOIN compensation_cases cc ON cc.damage_report_id = dr.id
WHERE cc.id IS NULL;

INSERT INTO compensation_records (
  compensation_case_id,
  record_type,
  title,
  description,
  amount
)
SELECT
  cc.id,
  'assessment',
  CASE
    WHEN dr.status = 'dismissed' THEN 'Compensation waived'
    WHEN dr.status = 'resolved' THEN 'Compensation assessed'
    ELSE 'Compensation case created'
  END,
  CASE
    WHEN dr.status = 'dismissed' THEN 'The linked damage report was dismissed. No compensation is required.'
    WHEN dr.status = 'resolved' THEN 'The damage report has been resolved and the estimated compensation has been prepared for follow-up.'
    ELSE 'A compensation workflow was opened automatically after the damage report was filed.'
  END,
  cc.agreed_amount
FROM compensation_cases cc
JOIN damage_reports dr ON dr.id = cc.damage_report_id
LEFT JOIN compensation_records cr
  ON cr.compensation_case_id = cc.id
  AND cr.record_type = 'assessment'
WHERE cr.id IS NULL;

CREATE OR REPLACE FUNCTION ensure_compensation_case_for_damage_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_borrower_id UUID;
  v_amount NUMERIC;
  v_case_id UUID;
BEGIN
  SELECT borrower_id INTO v_borrower_id
  FROM bookings
  WHERE id = NEW.booking_id;

  v_amount := estimate_damage_compensation(
    NEW.asset_id,
    NEW.booking_id,
    NEW.reporter_id,
    NEW.severity,
    COALESCE(NEW.auto_generated, false),
    NEW.status
  );

  INSERT INTO compensation_cases (
    damage_report_id,
    booking_id,
    asset_id,
    liable_user_id,
    status,
    assessed_amount,
    agreed_amount,
    payment_reference
  )
  VALUES (
    NEW.id,
    NEW.booking_id,
    NEW.asset_id,
    v_borrower_id,
    CASE
      WHEN NEW.status = 'dismissed' THEN 'waived'::compensation_status
      ELSE 'under_review'::compensation_status
    END,
    v_amount,
    CASE WHEN NEW.status = 'dismissed' THEN 0 ELSE v_amount END,
    'CMP-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 8))
  )
  ON CONFLICT (damage_report_id) DO NOTHING
  RETURNING id INTO v_case_id;

  IF v_case_id IS NULL THEN
    SELECT id INTO v_case_id
    FROM compensation_cases
    WHERE damage_report_id = NEW.id;
  END IF;

  IF v_case_id IS NOT NULL THEN
    INSERT INTO compensation_records (
      compensation_case_id,
      record_type,
      title,
      description,
      amount
    )
    VALUES (
      v_case_id,
      'assessment',
      'Compensation case created',
      'A compensation workflow was opened automatically after the damage report was filed.',
      v_amount
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_compensation_case_on_damage_report ON damage_reports;
CREATE TRIGGER create_compensation_case_on_damage_report
  AFTER INSERT ON damage_reports
  FOR EACH ROW
  EXECUTE FUNCTION ensure_compensation_case_for_damage_report();

-- ============================================================
-- END OF MIGRATION 024
-- ============================================================
