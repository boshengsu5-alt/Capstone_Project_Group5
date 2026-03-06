-- Seed data: categories + sample assets

INSERT INTO categories (name, name_zh, icon, description) VALUES
  ('Electronics',       '电子设备',   '💻', 'Laptops, tablets, projectors'),
  ('Cameras & Media',   '相机与媒体', '📷', 'Cameras, lenses, tripods'),
  ('Drones',            '无人机',     '🚁', 'Aerial drones'),
  ('Lab Equipment',     '实验室设备', '🔬', 'Scientific instruments'),
  ('Sports & Fitness',  '体育器材',   '⚽', 'Sports gear and fitness equipment'),
  ('Audio & Sound',     '音频设备',   '🎵', 'Microphones, speakers, mixers'),
  ('Books & Materials', '图书与资料', '📚', 'Textbooks and reference materials'),
  ('Furniture',         '家具',       '🪑', 'Desks, chairs, whiteboards'),
  ('Keys & Access',     '钥匙与门禁', '🔑', 'Room keys and access cards'),
  ('Other',             '其他',       '📦', 'Miscellaneous items');

-- Sample assets
DO $$
DECLARE
  cat_electronics UUID;
  cat_cameras UUID;
  cat_drones UUID;
  cat_lab UUID;
  cat_sports UUID;
  cat_audio UUID;
  cat_keys UUID;
BEGIN
  SELECT id INTO cat_electronics FROM categories WHERE name = 'Electronics';
  SELECT id INTO cat_cameras FROM categories WHERE name = 'Cameras & Media';
  SELECT id INTO cat_drones FROM categories WHERE name = 'Drones';
  SELECT id INTO cat_lab FROM categories WHERE name = 'Lab Equipment';
  SELECT id INTO cat_sports FROM categories WHERE name = 'Sports & Fitness';
  SELECT id INTO cat_audio FROM categories WHERE name = 'Audio & Sound';
  SELECT id INTO cat_keys FROM categories WHERE name = 'Keys & Access';

  INSERT INTO assets (category_id, name, description, serial_number, qr_code, condition, status, location, warranty_status, warranty_expiry, purchase_date, purchase_price) VALUES
    (cat_electronics, 'MacBook Pro 14"',     '14-inch M3 Pro, 18GB RAM',                'SN-MBP-2024-001',  'QR-MBP-001',  'new',  'available', 'Media Lab Room 201', 'active',  '2027-01-15', '2024-01-15', 2499.00),
    (cat_electronics, 'Dell 4K Projector',   '4K UHD Laser Projector',                  'SN-PROJ-2024-001', 'QR-PROJ-001', 'good', 'available', 'Lecture Hall A',     'active',  '2026-06-20', '2024-06-20', 1299.00),
    (cat_electronics, 'iPad Pro 12.9"',      '12.9-inch M2 with Apple Pencil',          'SN-IPAD-2024-001', 'QR-IPAD-001', 'good', 'available', 'IT Lab Room 305',    'active',  '2026-09-01', '2024-09-01', 1199.00),
    (cat_cameras, 'Canon EOS R5',            'Full-frame mirrorless, 45MP',              'SN-CAM-2024-001',  'QR-CAM-001',  'good', 'available', 'Media Lab Room 201', 'active',  '2026-03-10', '2024-03-10', 3899.00),
    (cat_cameras, 'Sony A7 IV',              'Full-frame mirrorless, 33MP',              'SN-CAM-2024-002',  'QR-CAM-002',  'good', 'available', 'Media Lab Room 201', 'active',  '2026-05-15', '2024-05-15', 2498.00),
    (cat_cameras, 'Professional Tripod',     'Carbon fiber tripod with fluid head',      'SN-TRI-2024-001',  'QR-TRI-001',  'good', 'available', 'Media Lab Room 201', 'none',    NULL,         '2023-11-01', 349.00),
    (cat_drones, 'DJI Mavic 3 Pro',          'Tri-camera aerial drone',                  'SN-DRN-2024-001',  'QR-DRN-001',  'new',  'available', 'Media Lab Room 201', 'active',  '2027-02-01', '2025-02-01', 2199.00),
    (cat_lab, 'Oscilloscope Rigol DS1054Z',  '4-channel digital oscilloscope',           'SN-OSC-2024-001',  'QR-OSC-001',  'good', 'available', 'Engineering Lab B',  'active',  '2027-01-01', '2024-01-01', 399.00),
    (cat_sports, 'Basketball Set',           'Official size basketball + pump',           'SN-BB-2024-001',   'QR-BB-001',   'good', 'available', 'Sports Hall',        'none',    NULL,         '2024-08-01', 49.00),
    (cat_sports, 'Table Tennis Set',         '2 paddles + balls + net',                   'SN-TT-2024-001',   'QR-TT-001',   'good', 'available', 'Student Center',     'none',    NULL,         '2024-08-01', 35.00),
    (cat_audio, 'Rode NT1 Microphone Kit',   'Studio condenser microphone bundle',        'SN-MIC-2024-001',  'QR-MIC-001',  'new',  'available', 'Media Lab Room 201', 'active',  '2027-06-01', '2025-06-01', 269.00),
    (cat_keys, 'Media Lab Room 201 Key',     'Master key for Media Lab',                  'SN-KEY-ML201',     'QR-KEY-001',  'good', 'available', 'Admin Office',       'none',    NULL,         NULL,         0.00);
END $$;
