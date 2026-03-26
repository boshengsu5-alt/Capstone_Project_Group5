-- ============================================================
-- UniGear: E2E Test — E2E-5 Overdue Detection
-- 端到端测试 — E2E-5 逾期检测场景
-- File: database/seed/e2e_test_overdue.sql
-- Usage: Run in Supabase SQL Editor to set up and verify E2E-5.
-- 用法：在 Supabase SQL Editor 中逐步执行，完成 E2E-5 逾期检测测试
--
-- Steps:
--   1. Run SECTION 1 — insert a fake overdue booking
--   2. Run SECTION 2 — call check_overdue_bookings()
--   3. Run SECTION 3 — verify results (booking=overdue, notification, credit deducted)
--   4. Run SECTION 4 (CLEANUP) when done to remove test data
-- ============================================================

-- ============================================================
-- SECTION 1: INSERT OVERDUE TEST BOOKING
-- 插入一条昨天到期的 active 借用记录（模拟学生未按时归还）
-- ============================================================

-- 使用已有的真实学生账号和可用资产（RLS 环境需要以真实数据插入）
-- 此处临时禁用 RLS，用 service_role key 或在 Supabase SQL Editor 执行
DO $$
DECLARE
  v_borrower_id UUID;
  v_asset_id    UUID;
  v_booking_id  UUID;
BEGIN
  -- 取一个 student 角色的真实用户
  SELECT id INTO v_borrower_id
  FROM profiles
  WHERE role = 'student'
  LIMIT 1;

  -- 取一个 available 状态的资产（测试前先置为 borrowed，测试后还原）
  SELECT id INTO v_asset_id
  FROM assets
  WHERE status = 'available'
  LIMIT 1;

  IF v_borrower_id IS NULL THEN
    RAISE EXCEPTION 'No student user found. Please seed test users first.';
  END IF;
  IF v_asset_id IS NULL THEN
    RAISE EXCEPTION 'No available asset found. Please seed test assets first.';
  END IF;

  -- 将资产状态临时设为 borrowed（模拟已取货状态）
  UPDATE assets SET status = 'borrowed', updated_at = now() WHERE id = v_asset_id;

  -- 插入一条 end_date = 昨天 的 active 借用记录
  INSERT INTO bookings (
    asset_id,
    borrower_id,
    start_date,
    end_date,
    status,
    notes
  ) VALUES (
    v_asset_id,
    v_borrower_id,
    now() - INTERVAL '3 days',   -- 3天前开始借用
    now() - INTERVAL '1 day',    -- 昨天就该还了，故意不还
    'active',
    '[E2E-TEST] Overdue detection test booking — safe to delete'
  )
  RETURNING id INTO v_booking_id;

  RAISE NOTICE '✅ E2E-5 test booking inserted: % (borrower: %, asset: %)',
    v_booking_id, v_borrower_id, v_asset_id;
END;
$$;

-- ============================================================
-- SECTION 2: CALL check_overdue_bookings()
-- 调用逾期检测函数（相当于移动端 HomeScreen 加载时自动触发的兜底机制）
-- ============================================================

SELECT check_overdue_bookings();

-- ============================================================
-- SECTION 3: VERIFY RESULTS
-- 验证结果：booking=overdue，通知已插入，信用分已扣减
-- ============================================================

-- 3-A: 检查测试 booking 是否变为 overdue
SELECT
  b.id,
  b.status,
  b.notes,
  b.end_date,
  a.name  AS asset_name,
  a.status AS asset_status,
  p.full_name,
  p.credit_score
FROM bookings b
JOIN assets   a ON b.asset_id    = a.id
JOIN profiles p ON b.borrower_id = p.id
WHERE b.notes LIKE '%E2E-TEST%'
ORDER BY b.created_at DESC;

-- ✅ 期望结果：
--   b.status      = 'overdue'
--   a.status      = 'borrowed'   （资产还没还，状态保持 borrowed）
--   p.credit_score 比插入前少 10  （-10 分）

-- 3-B: 检查逾期通知是否已插入
SELECT
  n.id,
  n.type,
  n.title,
  n.message,
  n.created_at,
  n.metadata
FROM notifications n
WHERE n.type = 'overdue_alert'
ORDER BY n.created_at DESC
LIMIT 5;

-- ✅ 期望结果：最新一条 type='overdue_alert'，metadata 含测试 booking_id

-- ============================================================
-- SECTION 4: CLEANUP — Run after test is verified
-- 测试完成后执行清理，避免影响其他 E2E 场景的数据
-- ============================================================

-- 警告：只在确认 E2E-5 通过后才执行此段！
-- WARNING: Only run this AFTER verifying E2E-5 passed!

/*
DO $$
DECLARE
  v_booking_id UUID;
  v_asset_id   UUID;
  v_borrower_id UUID;
BEGIN
  -- 获取测试 booking
  SELECT id, asset_id, borrower_id
  INTO v_booking_id, v_asset_id, v_borrower_id
  FROM bookings
  WHERE notes LIKE '%E2E-TEST%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_booking_id IS NOT NULL THEN
    -- 删除关联通知
    DELETE FROM notifications
    WHERE metadata->>'booking_id' = v_booking_id::TEXT;

    -- 还原信用分（+10 补回扣的分）
    PERFORM update_credit_score(v_borrower_id, 10, 'e2e_test_cleanup');

    -- 还原资产状态
    UPDATE assets SET status = 'available', updated_at = now() WHERE id = v_asset_id;

    -- 删除测试 booking
    DELETE FROM bookings WHERE id = v_booking_id;

    RAISE NOTICE '✅ E2E-5 test data cleaned up. Booking: %', v_booking_id;
  ELSE
    RAISE NOTICE 'No E2E-TEST booking found to clean up.';
  END IF;
END;
$$;
*/

-- ============================================================
-- END OF E2E-5 TEST SCRIPT
-- ============================================================
