-- Fix: allow borrowers to see damage reports on their own bookings.
-- 修复：允许借用者查看与自己借用关联的损坏报告（含管理员创建的）
--
-- Rollback: DROP POLICY "damage_reports_select" ON damage_reports;
--           then re-run the original policy from 001_initial_schema.sql

DROP POLICY IF EXISTS "damage_reports_select" ON damage_reports;

CREATE POLICY "damage_reports_select" ON damage_reports
  FOR SELECT TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = damage_reports.booking_id
        AND bookings.borrower_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );
