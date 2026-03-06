-- =============================================
-- Author: Letao (💻 店长桌面负责人)
-- Description: 初始化资产管理系统的核心库存表，并插入首批演示数据
-- Date: 2026-03-06
-- =============================================

-- 1. 创建资产主表
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_name TEXT NOT NULL,          -- 资产名称 (如: 大疆无人机)
    asset_type TEXT,                   -- 类别 (如: 航拍设备, 办公电脑)
    status TEXT DEFAULT 'available',   -- 状态 (available: 可借, busy: 已借出, broken: 维修)
    price DECIMAL(10, 2),              -- 资产原值 (用于财务统计)
    purchase_date DATE,                -- 采购日期
    location TEXT,                     -- 存放位置 (如: A 栋 302 仓库)
    serial_number TEXT UNIQUE,         -- 唯一编号/序列号
    remark TEXT,                       -- 备注
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO assets (asset_name, asset_type, status, price, location, serial_number)
VALUES 
('DJI Mavic 3 Pro', '航拍无人机', 'available', 13888.00, 'A座-302器材室', 'SN-UAV-001'),
('Sony A7R5 Body', '摄像设备', 'busy', 24500.00, 'B座-201器材室', 'SN-CAM-002'),
('MacBook Pro M3 16"', '办公电脑', 'available', 19999.00, '行政办公室', 'SN-PC-003'),
('Insta360 X3', '全景相机', 'broken', 2998.00, '维修部-老王处', 'SN-CAM-004'),
('iPad Pro 12.9"', '平板电脑', 'available', 9299.00, 'A座-302器材室', 'SN-TAB-005');
