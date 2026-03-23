-- ============================================================
-- UniGear: Fix booking date validation — 修复预约与取货日期校验
-- Migration: 009_fix_booking_date_validation.sql
-- Date: 2026-03-22
-- Author: Bosheng
--
-- Fixes:
-- 1. create_booking: now() includes time-of-day, so booking "today"
--    (2026-03-22T00:00) < now() (2026-03-22T16:00) was rejected.
--    → Compare by date only (p_start_date::date < CURRENT_DATE).
--
-- 2. activate_booking: no start-date guard — users could pick up
--    assets days before the booking period began.
--    → Add CURRENT_DATE < v_start_date::date check.
--
-- 修复：
-- 1. create_booking 用 now() 比较导致当天预约被拒（时分秒不为零），
--    改为按日期比较，允许预订当天。
-- 2. activate_booking 缺少开始日期校验，提前扫码也能取货，
--    新增校验：只有到了借用开始日期当天或之后才能取货。
--
-- ROLLBACK:
--   重新执行 007_create_booking_atomic.sql 和 003_rpc_functions.sql
--   中的原始 CREATE OR REPLACE FUNCTION 语句即可回退。
-- ============================================================

-- ============================================================
-- 1. Fix create_booking — 修复预约日期校验（允许当天预约）
-- ============================================================
CREATE OR REPLACE FUNCTION create_booking(
  p_asset_id   UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date   TIMESTAMPTZ,
  p_notes      TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_count INTEGER;
  v_new_booking_id UUID;
BEGIN
  -- ① 校验：结束时间必须晚于开始时间
  IF p_end_date <= p_start_date THEN
    RAISE EXCEPTION '结束时间必须晚于开始时间';
  END IF;

  -- ② 校验：开始日期不能早于今天（按日期比较，允许预订当天）
  IF p_start_date::date < CURRENT_DATE THEN
    RAISE EXCEPTION '不能预订过去的日期';
  END IF;

  -- ③ 关键锁：对资产行加排他锁（FOR UPDATE）
  PERFORM id
  FROM assets
  WHERE id = p_asset_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '资产不存在：%', p_asset_id;
  END IF;

  -- ④ 在持有锁的情况下检测日期冲突
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE asset_id = p_asset_id
    AND status IN ('pending', 'approved', 'active')
    AND start_date < p_end_date
    AND end_date   > p_start_date;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION '时间冲突：该设备在所选日期段内已被预订，请选择其他时间';
  END IF;

  -- ⑤ 无冲突，原子插入借用记录
  INSERT INTO bookings (
    asset_id,
    borrower_id,
    start_date,
    end_date,
    status,
    notes,
    pickup_photo_url,
    return_photo_url,
    rejection_reason
  )
  VALUES (
    p_asset_id,
    auth.uid(),
    p_start_date,
    p_end_date,
    'pending',
    COALESCE(p_notes, ''),
    '',
    '',
    ''
  )
  RETURNING id INTO v_new_booking_id;

  RETURN v_new_booking_id;
END;
$$;

-- ============================================================
-- 2. Fix activate_booking — 增加取货日期校验
-- ============================================================
CREATE OR REPLACE FUNCTION activate_booking(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id UUID;
  v_borrower_id UUID;
  v_status booking_status;
  v_start_date TIMESTAMPTZ;
BEGIN
  -- 获取借用记录信息并锁定行，防止并发
  SELECT asset_id, borrower_id, status, start_date
  INTO v_asset_id, v_borrower_id, v_status, v_start_date
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- 校验：借用记录必须存在
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- 校验：只有 approved 状态才能激活
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'Booking is not in approved status (current: %)', v_status;
  END IF;

  -- 校验：只有借用者本人才能激活（取货）
  IF v_borrower_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the borrower can activate this booking';
  END IF;

  -- 校验：只有到了借用开始日期当天或之后才能取货
  IF CURRENT_DATE < v_start_date::date THEN
    RAISE EXCEPTION '还未到取货日期，请在 % 当天或之后扫码取货', v_start_date::date;
  END IF;

  -- 更新借用状态为 active
  UPDATE bookings
  SET status = 'active',
      updated_at = now()
  WHERE id = p_booking_id;

  -- 更新资产状态为 borrowed
  UPDATE assets
  SET status = 'borrowed',
      updated_at = now()
  WHERE id = v_asset_id;
END;
$$;

-- ============================================================
-- END OF MIGRATION 009
-- ============================================================
