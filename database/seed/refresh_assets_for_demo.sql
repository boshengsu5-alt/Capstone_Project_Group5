-- ============================================================
-- UniGear — Demo Asset Refresh Script
-- 演示资产刷新脚本
--
-- Purpose:
--   1. Set all assets to available (on-shelf)
--   2. Randomly assign condition: ~65% 'new', ~35% 'good'
--   3. Ensure all assets have high-quality product images
--
-- Run in: Supabase Dashboard → SQL Editor
-- 运行方式：Supabase 控制台 → SQL Editor
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: 所有商品上架 + 随机分配成色（偏新）
-- Set all assets available + randomly assign near-new condition
-- ============================================================

UPDATE public.assets
SET
    status      = 'available',
    is_archived = false,
    -- 用 random() 随机分配成色：65% new，35% good，全部偏新
    -- 需要显式转换为枚举类型 asset_condition
    condition   = CASE
        WHEN random() < 0.65 THEN 'new'
        ELSE 'good'
    END::asset_condition,
    updated_at  = NOW();


-- ============================================================
-- STEP 2: 为 12 件种子资产补齐/刷新图片
-- Re-apply images for the 12 original seed assets
-- ============================================================

-- MacBook Pro 14"
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
    'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800',
    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800'
] WHERE qr_code = 'QR-MBP-001';

-- Dell 4K Projector
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800',
    'https://images.unsplash.com/photo-1601944179066-29786cb9d32a?w=800'
] WHERE qr_code = 'QR-PROJ-001';

-- iPad Pro 12.9"
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
    'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800',
    'https://images.unsplash.com/photo-1623126908029-58cb08a2b272?w=800'
] WHERE qr_code = 'QR-IPAD-001';

-- Canon EOS R5
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
    'https://images.unsplash.com/photo-1495707902641-75cac588d2e9?w=800'
] WHERE qr_code = 'QR-CAM-001';

-- Sony A7 IV
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=800',
    'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800',
    'https://images.unsplash.com/photo-1606986628170-f0c86dbd80db?w=800'
] WHERE qr_code = 'QR-CAM-002';

-- Professional Tripod
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1543192552-e2b66bd9282d?w=800',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'
] WHERE qr_code = 'QR-TRI-001';

-- DJI Mavic 3 Pro
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=800',
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
    'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800'
] WHERE qr_code = 'QR-DRN-001';

-- Oscilloscope Rigol DS1054Z
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800',
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800'
] WHERE qr_code = 'QR-OSC-001';

-- Basketball Set
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800'
] WHERE qr_code = 'QR-BB-001';

-- Table Tennis Set
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=800',
    'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=800'
] WHERE qr_code = 'QR-TT-001';

-- Rode NT1 Microphone Kit
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800',
    'https://images.unsplash.com/photo-1551817958-d9d86fb29431?w=800',
    'https://images.unsplash.com/photo-1619983081563-430f63602796?w=800'
] WHERE qr_code = 'QR-MIC-001';

-- Media Lab Room 201 Key
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1584985429926-08867327d3a6?w=800',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
] WHERE qr_code = 'QR-KEY-001';


-- ============================================================
-- STEP 3: 为测试资产补图（Test Drone A / Test Camera B）
-- Assign images to the 2 test assets from mock data
-- ============================================================

-- Test Drone A
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=800',
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800'
] WHERE qr_code = 'QR-TEST-A';

-- Test Camera B
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'
] WHERE qr_code = 'QR-TEST-B';


-- ============================================================
-- STEP 4: 对所有仍然没有图片的资产，按分类自动补图
-- Fallback: assign category-appropriate images to any remaining
-- assets that still have an empty images array
-- ============================================================

-- Electronics (无图的)
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
    'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800'
]
WHERE array_length(images, 1) IS NULL
  AND category_id = (SELECT id FROM public.categories WHERE name = 'Electronics' LIMIT 1);

-- Cameras & Media (无图的)
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'
]
WHERE array_length(images, 1) IS NULL
  AND category_id = (SELECT id FROM public.categories WHERE name = 'Cameras & Media' LIMIT 1);

-- Drones (无图的)
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=800',
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800'
]
WHERE array_length(images, 1) IS NULL
  AND category_id = (SELECT id FROM public.categories WHERE name = 'Drones' LIMIT 1);

-- Lab Equipment (无图的)
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800',
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800'
]
WHERE array_length(images, 1) IS NULL
  AND category_id = (SELECT id FROM public.categories WHERE name = 'Lab Equipment' LIMIT 1);

-- Sports & Fitness (无图的)
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800'
]
WHERE array_length(images, 1) IS NULL
  AND category_id = (SELECT id FROM public.categories WHERE name = 'Sports & Fitness' LIMIT 1);

-- Audio & Sound (无图的)
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800',
    'https://images.unsplash.com/photo-1551817958-d9d86fb29431?w=800'
]
WHERE array_length(images, 1) IS NULL
  AND category_id = (SELECT id FROM public.categories WHERE name = 'Audio & Sound' LIMIT 1);

-- Books & Materials (无图的)
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800'
]
WHERE array_length(images, 1) IS NULL
  AND category_id = (SELECT id FROM public.categories WHERE name = 'Books & Materials' LIMIT 1);

-- Furniture (无图的)
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800'
]
WHERE array_length(images, 1) IS NULL
  AND category_id = (SELECT id FROM public.categories WHERE name = 'Furniture' LIMIT 1);

-- Keys & Access (无图的)
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1584985429926-08867327d3a6?w=800',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
]
WHERE array_length(images, 1) IS NULL
  AND category_id = (SELECT id FROM public.categories WHERE name = 'Keys & Access' LIMIT 1);

-- Other / Test Equipment / 其余所有无图的 (通用兜底)
UPDATE public.assets SET images = ARRAY[
    'https://images.unsplash.com/photo-1553484771-371a605b060b?w=800',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'
]
WHERE array_length(images, 1) IS NULL;


COMMIT;

-- ============================================================
-- 验证结果 Verification (取消注释后运行)
-- ============================================================
-- SELECT name, status, condition, is_archived, array_length(images,1) AS photo_count
--   FROM public.assets
--   ORDER BY name;
