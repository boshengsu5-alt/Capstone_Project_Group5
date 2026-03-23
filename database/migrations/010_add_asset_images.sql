-- ============================================================
-- UniGear: Add product images to existing assets — 为现有资产添加产品图片
-- Migration: 010_add_asset_images.sql
-- Date: 2026-03-22
-- Author: Bosheng
--
-- Populates the images column (text[]) for all seed assets
-- using publicly available product images (Unsplash).
--
-- 为所有种子数据中的资产填充产品展示图片。
--
-- ROLLBACK:
--   UPDATE assets SET images = '{}' WHERE qr_code LIKE 'QR-%';
-- ============================================================

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
  'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800'
] WHERE qr_code = 'QR-MBP-001';

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800'
] WHERE qr_code = 'QR-PROJ-001';

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
  'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800'
] WHERE qr_code = 'QR-IPAD-001';

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
  'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'
] WHERE qr_code = 'QR-CAM-001';

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=800',
  'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800'
] WHERE qr_code = 'QR-CAM-002';

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1543192552-e2b66bd9282d?w=800'
] WHERE qr_code = 'QR-TRI-001';

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=800',
  'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800'
] WHERE qr_code = 'QR-DRN-001';

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800'
] WHERE qr_code = 'QR-OSC-001';

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800'
] WHERE qr_code = 'QR-BB-001';

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=800'
] WHERE qr_code = 'QR-TT-001';

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800'
] WHERE qr_code = 'QR-MIC-001';

UPDATE assets SET images = ARRAY[
  'https://images.unsplash.com/photo-1584985429926-08867327d3a6?w=800'
] WHERE qr_code = 'QR-KEY-001';

-- ============================================================
-- END OF MIGRATION 010
-- ============================================================
