-- ============================================================
-- E2E-5：逾期检测测试脚本
-- UniGear QA — Overdue Detection Test
--
-- 使用方法：在 Supabase Dashboard → SQL Editor 中逐段执行
-- Usage: Run each section in Supabase Dashboard → SQL Editor
--
-- 测试目标：
--   步骤1 插入一条 end_date 为昨天的 active booking
--   步骤2 调用 check_overdue_bookings()
--   步骤3 验证 booking=overdue、通知已插入、信用分已扣
--   步骤4 清理测试数据
-- ============================================================

-- ============================================================
-- 【准备】查找测试用的真实 user_id 和 asset_id
-- 在步骤1之前先运行这段，把结果填入下面的变量
-- ============================================================
SELECT
    p.id   AS user_id,
    p.full_name,
    p.credit_score
FROM profiles p
WHERE p.role = 'student'
LIMIT 5;

SELECT
    a.id   AS asset_id,
    a.name,
    a.status
FROM assets a
WHERE a.status = 'available'
LIMIT 5;

-- ============================================================
-- 【步骤1】插入逾期测试 booking
-- 把 <USER_ID> 和 <ASSET_ID> 替换为上面查出来的真实值
-- ============================================================
INSERT INTO bookings (
    borrower_id,
    asset_id,
    status,
    start_date,
    end_date,
    notes
)
VALUES (
    '<USER_ID>',                          -- 替换为真实学生 ID
    '<ASSET_ID>',                         -- 替换为真实资产 ID
    'active',
    now() - INTERVAL '3 days',           -- 3 天前开始
    now() - INTERVAL '1 day',            -- 昨天到期（已逾期）
    '[E2E-5 TEST] Overdue detection test - safe to delete'
)
RETURNING id AS new_booking_id, status, end_date;

-- 记住上面返回的 new_booking_id，后续验证和清理需要用到

-- ============================================================
-- 【步骤2】调用逾期检测 RPC 函数
-- ============================================================
SELECT check_overdue_bookings();

-- ============================================================
-- 【步骤3】验证结果
-- 把 <NEW_BOOKING_ID> 替换为步骤1返回的 ID
-- ============================================================

-- 3a. 验证 booking 状态已变为 overdue
SELECT id, status, end_date, updated_at
FROM bookings
WHERE id = '<NEW_BOOKING_ID>';
-- 预期：status = 'overdue'

-- 3b. 验证逾期通知已插入
SELECT id, type, title, message, created_at
FROM notifications
WHERE metadata->>'booking_id' = '<NEW_BOOKING_ID>'
  AND type = 'overdue_alert'
ORDER BY created_at DESC
LIMIT 3;
-- 预期：至少一条 type=overdue_alert 的通知

-- 3c. 验证信用分已扣减（-10）
-- 先查记录扣分前的分数，对比扣分后
SELECT id, full_name, credit_score
FROM profiles
WHERE id = '<USER_ID>';
-- 预期：比测试前少 10 分

-- ============================================================
-- 【步骤4】清理测试数据（测试完成后运行）
-- ============================================================

-- 删除测试通知
DELETE FROM notifications
WHERE metadata->>'booking_id' = '<NEW_BOOKING_ID>';

-- 删除测试 booking
DELETE FROM bookings
WHERE id = '<NEW_BOOKING_ID>';

-- 恢复被扣的信用分（可选，防止影响真实用户分数）
-- SELECT update_credit_score('<USER_ID>', 10, 'e2e_test_cleanup');

-- ============================================================
-- END OF E2E-5 TEST SCRIPT
-- ============================================================
