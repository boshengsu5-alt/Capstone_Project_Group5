-- ============================================================
-- UniGear: Atomic Booking Creation — 原子化预约，防止并发超卖
-- 校园资产管理系统 — 并发锁定，彻底杜绝"幽灵超卖"
-- Migration: 007_create_booking_atomic.sql
-- Date: 2026-03-18 (Day 12)
-- Author: Bosheng
--
-- Problem: The old client-side flow was:
--   1. SELECT to check for conflicts
--   2. INSERT the booking
-- Between step 1 and 2, another request could slip in → double booking.
--
-- 问题：旧方案在客户端先 SELECT 查冲突、再 INSERT，两步之间存在时间窗口。
-- 两名学生同时发请求时，都会通过冲突检查，都完成 INSERT，造成"幽灵超卖"。
--
-- Solution: Move both check + insert into one SECURITY DEFINER function.
-- PostgreSQL guarantees the FOR UPDATE lock holds for the entire transaction,
-- so no concurrent session can insert a conflicting booking between the check
-- and the insert.
--
-- 解决：将"冲突检查 + 插入"合并为一个数据库函数，用 SELECT ... FOR UPDATE
-- 锁住资产行。PostgreSQL 保证同一事务内的 FOR UPDATE 锁贯穿整个函数调用，
-- 其他并发会话必须等待锁释放后才能继续，从根本上消除竞态条件。
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS create_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
-- ============================================================

CREATE OR REPLACE FUNCTION create_booking(
  p_asset_id   UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date   TIMESTAMPTZ,
  p_notes      TEXT DEFAULT ''
)
RETURNS UUID   -- 返回新建借用记录的 ID
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
  --    只有拿到这把锁的会话才能继续执行，其他并发请求必须排队等待。
  --    这确保了"冲突检查"和"INSERT"之间不会有其他事务插入。
  PERFORM id
  FROM assets
  WHERE id = p_asset_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '资产不存在：%', p_asset_id;
  END IF;

  -- ④ 在持有锁的情况下检测日期冲突
  --    重叠条件：existing.start_date < newEnd AND existing.end_date > newStart
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
    auth.uid(),    -- 从 JWT 中读取当前用户，防止伪造 borrower_id
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

-- 授予已认证用户调用权限
GRANT EXECUTE ON FUNCTION create_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

-- ============================================================
-- END OF MIGRATION 007
-- ============================================================
