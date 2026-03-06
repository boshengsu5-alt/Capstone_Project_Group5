-- ============================================================
-- UniGear: Campus Asset Management System — Initial Schema
-- 校园资产管理系统 — 初始数据库模式
-- Migration: 001_initial_schema.sql
-- Date: 2026-03-06
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS & ENUMS. 扩展和枚举类型
-- ============================================================

-- Enable UUID generation. 启用 UUID 生成
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User role enum. 用户角色枚举
CREATE TYPE user_role AS ENUM ('student', 'admin', 'staff');

-- Asset condition enum. 资产状况枚举
CREATE TYPE asset_condition AS ENUM ('new', 'good', 'fair', 'poor', 'damaged');

-- Asset status enum. 资产状态枚举
CREATE TYPE asset_status AS ENUM ('available', 'borrowed', 'maintenance', 'retired');

-- Warranty status enum. 保修状态枚举
CREATE TYPE warranty_status AS ENUM ('active', 'expired', 'none');

-- Booking status enum. 借用状态枚举
CREATE TYPE booking_status AS ENUM (
  'pending',    -- Awaiting admin approval. 等待管理员审批
  'approved',   -- Admin approved, awaiting pickup. 已批准，等待取用
  'rejected',   -- Admin rejected. 已拒绝
  'active',     -- Item picked up, in use. 已取用，使用中
  'returned',   -- Item returned successfully. 已归还
  'overdue',    -- Past due date, not returned. 逾期未归还
  'cancelled'   -- Cancelled by user. 用户取消
);

-- Damage severity enum. 损坏严重程度枚举
CREATE TYPE damage_severity AS ENUM ('minor', 'moderate', 'severe');

-- Damage report status enum. 损坏报告状态枚举
CREATE TYPE damage_report_status AS ENUM ('open', 'investigating', 'resolved', 'dismissed');

-- Notification type enum. 通知类型枚举
CREATE TYPE notification_type AS ENUM (
  'booking_approved',
  'booking_rejected',
  'return_reminder',
  'overdue_alert',
  'damage_reported',
  'system'
);

-- ============================================================
-- 1. PROFILES — 用户资料表
-- Extends Supabase auth.users with application-specific data.
-- 扩展 Supabase auth.users，添加应用专属数据
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  student_id  TEXT UNIQUE,               -- University student ID. 学号
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT DEFAULT '',
  avatar_url  TEXT DEFAULT '',
  role        user_role NOT NULL DEFAULT 'student',
  credit_score INTEGER NOT NULL DEFAULT 100 CHECK (credit_score >= 0 AND credit_score <= 200),
  department  TEXT DEFAULT '',            -- College/department. 学院/系
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'User profiles extending auth.users. 用户资料表，扩展 auth.users';
COMMENT ON COLUMN profiles.credit_score IS 'Trust score for borrowing privileges (0-200, default 100). 信用评分（0-200，默认100）';

-- ============================================================
-- 2. CATEGORIES — 资产分类表
-- ============================================================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,       -- English name. 英文名称
  name_zh     TEXT DEFAULT '',            -- Chinese name. 中文名称
  icon        TEXT DEFAULT '',            -- Icon identifier (e.g., emoji or icon name). 图标标识
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE categories IS 'Asset categories (bilingual). 资产分类表（双语）';

-- ============================================================
-- 3. ASSETS — 资产/设备表
-- Core table for all managed equipment.
-- 核心表，管理所有设备
-- ============================================================
CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  serial_number   TEXT UNIQUE,              -- Manufacturer serial number. 制造商序列号
  qr_code         TEXT UNIQUE,              -- QR code identifier for scanning. 二维码标识，用于扫描借用
  condition       asset_condition NOT NULL DEFAULT 'good',
  status          asset_status NOT NULL DEFAULT 'available',
  location        TEXT DEFAULT '',           -- Physical location (e.g., "Media Lab Room 201"). 物理位置
  images          TEXT[] DEFAULT '{}',       -- Array of image URLs. 图片 URL 数组
  warranty_status warranty_status NOT NULL DEFAULT 'none',
  warranty_expiry DATE,                      -- Warranty expiration date. 保修到期日
  purchase_date   DATE,
  purchase_price  DECIMAL(10,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE assets IS 'Equipment and assets managed by the system. 系统管理的设备与资产';
COMMENT ON COLUMN assets.qr_code IS 'Unique QR code for mobile scanning. 移动端扫码用的唯一二维码';

-- ============================================================
-- 4. BOOKINGS — 借用记录 & 审批工作流
-- Tracks the full lifecycle: request → approval → pickup → return.
-- 追踪完整生命周期：申请 → 审批 → 取用 → 归还
-- ============================================================
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id          UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  borrower_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  approver_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- Admin who approved/rejected. 审批的管理员
  status            booking_status NOT NULL DEFAULT 'pending',
  start_date        TIMESTAMPTZ NOT NULL,    -- Requested start of borrowing period. 借用开始时间
  end_date          TIMESTAMPTZ NOT NULL,    -- Requested end of borrowing period. 借用结束时间
  actual_return_date TIMESTAMPTZ,            -- When item was actually returned. 实际归还时间
  pickup_photo_url  TEXT DEFAULT '',         -- Photo taken at pickup. 取用时拍照
  return_photo_url  TEXT DEFAULT '',         -- Condition proof photo at return. 归还时的状况证明照片
  notes             TEXT DEFAULT '',         -- Borrower's notes for the request. 借用者备注
  rejection_reason  TEXT DEFAULT '',         -- Reason if rejected by admin. 拒绝原因
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent end_date before start_date. 确保结束时间不早于开始时间
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

COMMENT ON TABLE bookings IS 'Borrowing records with full approval workflow. 包含完整审批流程的借用记录';
COMMENT ON COLUMN bookings.return_photo_url IS 'Condition proof photo required for return. 归还时必须提供的状况证明照片';

-- ============================================================
-- 5. DAMAGE_REPORTS — 损坏报告表
-- Tracks incidents when equipment is returned damaged.
-- 追踪设备归还时损坏的事故
-- ============================================================
CREATE TABLE damage_reports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  asset_id         UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  reporter_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  description      TEXT NOT NULL,
  severity         damage_severity NOT NULL DEFAULT 'minor',
  photo_urls       TEXT[] DEFAULT '{}',      -- Evidence photos. 证据照片
  status           damage_report_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE damage_reports IS 'Equipment damage incident tracking. 设备损坏事故追踪';

-- ============================================================
-- 6. NOTIFICATIONS — 通知表
-- Push notifications for real-time alerts.
-- 实时推送通知
-- ============================================================
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL DEFAULT '',
  is_read    BOOLEAN NOT NULL DEFAULT false,
  metadata   JSONB DEFAULT '{}',           -- Additional data (e.g., booking_id). 附加数据
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE notifications IS 'User notifications for real-time alerts. 用户实时通知';

-- ============================================================
-- 7. REVIEWS — 评价表
-- Post-return feedback for completed bookings.
-- 借用完成后的评价反馈
-- ============================================================
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE reviews IS 'Post-return reviews for completed bookings. 归还后的借用评价';

-- ============================================================
-- 8. INDEXES — 索引（性能优化）
-- ============================================================

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_student_id ON profiles(student_id);

-- Assets
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_qr_code ON assets(qr_code);
CREATE INDEX idx_assets_location ON assets(location);

-- Bookings
CREATE INDEX idx_bookings_asset ON bookings(asset_id);
CREATE INDEX idx_bookings_borrower ON bookings(borrower_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);

-- Damage Reports
CREATE INDEX idx_damage_reports_asset ON damage_reports(asset_id);
CREATE INDEX idx_damage_reports_status ON damage_reports(status);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Reviews
CREATE INDEX idx_reviews_booking ON reviews(booking_id);

-- ============================================================
-- 9. UPDATED_AT TRIGGER — 自动更新时间戳
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at. 为有 updated_at 的表应用触发器
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_assets_updated_at
  BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_damage_reports_updated_at
  BEFORE UPDATE ON damage_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. AUTO-CREATE PROFILE — 注册时自动创建用户资料
-- When a new user signs up via Supabase Auth, automatically
-- create a row in the profiles table.
-- 当用户通过 Supabase Auth 注册时，自动在 profiles 表创建一行
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS) — 行级安全策略
-- ============================================================

-- --- PROFILES RLS ---
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read profiles. 任何已认证用户可读取资料
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can only update their own profile. 用户只能更新自己的资料
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- --- CATEGORIES RLS ---
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read categories. 任何已认证用户可读取分类
CREATE POLICY "categories_select" ON categories
  FOR SELECT TO authenticated
  USING (true);

-- Only admins/staff can manage categories. 仅管理员/工作人员可管理分类
CREATE POLICY "categories_insert_admin" ON categories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "categories_update_admin" ON categories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "categories_delete_admin" ON categories
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- --- ASSETS RLS ---
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view assets. 任何已认证用户可查看资产
CREATE POLICY "assets_select" ON assets
  FOR SELECT TO authenticated
  USING (true);

-- Only admins/staff can create, update, delete assets. 仅管理员/工作人员可增删改资产
CREATE POLICY "assets_insert_admin" ON assets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "assets_update_admin" ON assets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "assets_delete_admin" ON assets
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- --- BOOKINGS RLS ---
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can see their own bookings; admins/staff can see all. 用户看自己的；管理员看全部
CREATE POLICY "bookings_select" ON bookings
  FOR SELECT TO authenticated
  USING (
    borrower_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Authenticated users can create bookings. 已认证用户可以创建借用申请
CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (borrower_id = auth.uid());

-- Borrower can cancel own pending bookings; admins can update any. 借用者可取消自己待审批的；管理员可更新任何
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING (
    borrower_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- --- DAMAGE_REPORTS RLS ---
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;

-- Admins/staff can see all; reporters can see their own. 管理员看全部；报告者看自己的
CREATE POLICY "damage_reports_select" ON damage_reports
  FOR SELECT TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Authenticated users can create damage reports. 已认证用户可创建损坏报告
CREATE POLICY "damage_reports_insert" ON damage_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Only admins can update damage reports (change status, add resolution). 仅管理员可更新损坏报告
CREATE POLICY "damage_reports_update_admin" ON damage_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- --- NOTIFICATIONS RLS ---
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications. 用户只能看到自己的通知
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications. 用户可以标记已读自己的通知
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- System/admins insert notifications (via service role or triggers). 系统/管理员插入通知
CREATE POLICY "notifications_insert_admin" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- --- REVIEWS RLS ---
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read reviews. 任何已认证用户可读取评价
CREATE POLICY "reviews_select" ON reviews
  FOR SELECT TO authenticated
  USING (true);

-- Users can create reviews for their own completed bookings. 用户可为自己已完成的借用创建评价
CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- Users can update their own reviews. 用户可更新自己的评价
CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid());

-- ============================================================
-- END OF MIGRATION 001
-- ============================================================
