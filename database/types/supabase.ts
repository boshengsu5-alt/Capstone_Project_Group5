/**
 * UniGear Database Type Definitions. UniGear 数据库类型定义
 *
 * Auto-generated from the database schema. 根据数据库 schema 生成
 * This is the SINGLE SOURCE OF TRUTH for all frontend types.
 * 这是所有前端类型的唯一事实来源
 *
 * Contract-Driven: Both app-web and app-mobile import from this file.
 * 合约驱动：Web 端和移动端均从此文件导入类型
 */

// ============================================================
// Enum Types. 枚举类型
// ============================================================

/** User role. 用户角色 */
export type UserRole = 'student' | 'admin' | 'staff';

/** Asset physical condition. 资产物理状况 */
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged';

/** Asset availability status. 资产可用状态 */
export type AssetStatus = 'available' | 'borrowed' | 'maintenance' | 'retired';

/** Warranty status. 保修状态 */
export type WarrantyStatus = 'active' | 'expired' | 'none';

/** Booking lifecycle status. 借用生命周期状态 */
export type BookingStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'active'
    | 'returned'
    | 'overdue'
    | 'cancelled';

/** Damage severity level. 损坏严重程度 */
export type DamageSeverity = 'minor' | 'moderate' | 'severe';

/** Damage report status. 损坏报告状态 */
export type DamageReportStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

/** Notification type. 通知类型 */
export type NotificationType =
    | 'booking_approved'
    | 'booking_rejected'
    | 'return_reminder'
    | 'overdue_alert'
    | 'damage_reported'
    | 'system';

// ============================================================
// Table Row Types. 表行类型
// ============================================================

/** Profile row — extends auth.users. 用户资料行 */
export interface Profile {
    id: string;
    full_name: string;
    student_id: string | null;
    email: string;
    phone: string;
    avatar_url: string;
    role: UserRole;
    credit_score: number;
    department: string;
    created_at: string;
    updated_at: string;
}

/** Category row. 分类行 */
export interface Category {
    id: string;
    name: string;
    name_zh: string;
    icon: string;
    description: string;
    created_at: string;
}

/** Asset row. 资产行 */
export interface Asset {
    id: string;
    category_id: string;
    created_by: string | null;
    name: string;
    description: string;
    serial_number: string | null;
    qr_code: string | null;
    condition: AssetCondition;
    status: AssetStatus;
    location: string;
    images: string[];
    warranty_status: WarrantyStatus;
    warranty_expiry: string | null;
    purchase_date: string | null;
    purchase_price: number | null;
    created_at: string;
    updated_at: string;
}

/** Booking row. 借用记录行 */
export interface Booking {
    id: string;
    asset_id: string;
    borrower_id: string;
    approver_id: string | null;
    status: BookingStatus;
    start_date: string;
    end_date: string;
    actual_return_date: string | null;
    pickup_photo_url: string;
    return_photo_url: string;
    notes: string;
    rejection_reason: string;
    created_at: string;
    updated_at: string;
}

/** Damage report row. 损坏报告行 */
export interface DamageReport {
    id: string;
    booking_id: string;
    asset_id: string;
    reporter_id: string;
    description: string;
    severity: DamageSeverity;
    photo_urls: string[];
    status: DamageReportStatus;
    resolution_notes: string;
    created_at: string;
    updated_at: string;
}

/** Notification row. 通知行 */
export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    is_read: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
}

/** Review row. 评价行 */
export interface Review {
    id: string;
    booking_id: string;
    reviewer_id: string;
    rating: number;
    comment: string;
    created_at: string;
}

// ============================================================
// Insert Types (omit auto-generated fields). 插入类型
// ============================================================

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;
export type CategoryInsert = Omit<Category, 'id' | 'created_at'>;
export type AssetInsert = Omit<Asset, 'id' | 'created_at' | 'updated_at'>;
export type BookingInsert = Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'approver_id' | 'actual_return_date'>;
export type DamageReportInsert = Omit<DamageReport, 'id' | 'created_at' | 'updated_at' | 'status' | 'resolution_notes'>;
export type NotificationInsert = Omit<Notification, 'id' | 'created_at' | 'is_read'>;
export type ReviewInsert = Omit<Review, 'id' | 'created_at'>;

// ============================================================
// Update Types (all fields optional). 更新类型
// ============================================================

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
export type CategoryUpdate = Partial<Omit<Category, 'id' | 'created_at'>>;
export type AssetUpdate = Partial<Omit<Asset, 'id' | 'created_at' | 'updated_at'>>;
export type BookingUpdate = Partial<Omit<Booking, 'id' | 'created_at' | 'updated_at'>>;
export type DamageReportUpdate = Partial<Omit<DamageReport, 'id' | 'created_at' | 'updated_at'>>;
export type NotificationUpdate = Partial<Pick<Notification, 'is_read'>>;
export type ReviewUpdate = Partial<Pick<Review, 'rating' | 'comment'>>;

// ============================================================
// Supabase Database Interface. Supabase 数据库接口
// ============================================================

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: ProfileInsert;
                Update: ProfileUpdate;
            };
            categories: {
                Row: Category;
                Insert: CategoryInsert;
                Update: CategoryUpdate;
            };
            assets: {
                Row: Asset;
                Insert: AssetInsert;
                Update: AssetUpdate;
            };
            bookings: {
                Row: Booking;
                Insert: BookingInsert;
                Update: BookingUpdate;
            };
            damage_reports: {
                Row: DamageReport;
                Insert: DamageReportInsert;
                Update: DamageReportUpdate;
            };
            notifications: {
                Row: Notification;
                Insert: NotificationInsert;
                Update: NotificationUpdate;
            };
            reviews: {
                Row: Review;
                Insert: ReviewInsert;
                Update: ReviewUpdate;
            };
        };
        Enums: {
            user_role: UserRole;
            asset_condition: AssetCondition;
            asset_status: AssetStatus;
            warranty_status: WarrantyStatus;
            booking_status: BookingStatus;
            damage_severity: DamageSeverity;
            damage_report_status: DamageReportStatus;
            notification_type: NotificationType;
        };
    };
}
