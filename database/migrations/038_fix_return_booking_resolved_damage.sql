-- ============================================================
-- UniGear: Fix return_booking ignoring resolved damage reports
-- 修复 return_booking 忽略已解决损坏报告导致资产不下架的问题
-- Migration: 038_fix_return_booking_resolved_damage.sql
-- Date: 2026-04-01
-- Author: Bosheng
--
-- 问题：
--   用户主动报告损坏 → 管理员审核完毕（resolved）→ 用户归还设备
--   此时 return_booking 只检查 open/investigating 状态的损坏报告，
--   resolved 的报告被漏掉，资产错误地恢复为 available 而非 maintenance。
--
-- 修复：
--   把"是否有损坏报告"的判断改为：存在任何非 dismissed 的报告
--   即 open / investigating / resolved 均视为需要进入 maintenance
--   dismissed 表示报告无效，不影响资产状态
--
-- Rollback:
--   重新执行 026_fix_return_booking_asset_status_cast.sql 即可回滚
-- ============================================================

CREATE OR REPLACE FUNCTION return_booking(p_booking_id UUID, p_photo_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id          UUID;
  v_borrower_id       UUID;
  v_status            booking_status;
  v_has_damage_report BOOLEAN := FALSE;
  v_return_message    TEXT;
BEGIN
  SELECT asset_id, borrower_id, status
  INTO v_asset_id, v_borrower_id, v_status
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  IF v_status NOT IN ('active', 'overdue') THEN
    RAISE EXCEPTION 'Booking is not in active/overdue status (current: %)', v_status;
  END IF;

  UPDATE bookings
  SET status             = 'returned',
      return_photo_url   = p_photo_url,
      actual_return_date = now(),
      updated_at         = now()
  WHERE id = p_booking_id;

  -- 检查是否存在任何非 dismissed 的损坏报告（含已解决的）
  -- dismissed = 管理员判定报告无效，不需要维修
  -- open / investigating / resolved 均表示存在实际损坏，资产需进入 maintenance
  SELECT EXISTS (
    SELECT 1
    FROM   damage_reports
    WHERE  booking_id = p_booking_id
      AND  status     <> 'dismissed'
  )
  INTO v_has_damage_report;

  UPDATE assets
  SET status     = CASE
                     WHEN v_has_damage_report THEN 'maintenance'::asset_status
                     ELSE 'available'::asset_status
                   END,
      updated_at = now()
  WHERE id = v_asset_id;

  PERFORM update_credit_score(v_borrower_id, 5, 'return_bonus');

  v_return_message := CASE
    WHEN v_has_damage_report THEN
      '设备已归还，信用分 +5。由于存在损坏报告，设备已暂时下架进入维修状态，待管理员确认后重新上架。'
    ELSE
      '设备已成功归还，信用分 +5。'
  END;

  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    v_borrower_id,
    'system',
    '设备归还成功',
    v_return_message,
    jsonb_build_object(
      'booking_id',          p_booking_id,
      'reason',              'return_bonus_granted',
      'credit_delta',        5,
      'damage_report_pending', v_has_damage_report
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION return_booking(UUID, TEXT) TO authenticated;

-- ============================================================
-- END OF MIGRATION 038
-- ============================================================
