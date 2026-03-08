/**
 * UniGear Campus Asset Management System
 * TypeScript Types corresponding to 001_initial_schema.sql
 */

// ============================================================
// ENUMS
// ============================================================

export type UserRole = 'student' | 'admin' | 'staff';

export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged';

export type AssetStatus = 'available' | 'borrowed' | 'maintenance' | 'retired';

export type WarrantyStatus = 'active' | 'expired' | 'none';

export type BookingStatus = 
  | 'pending'    // Awaiting admin approval. 等待管理员审批
  | 'approved'   // Admin approved, awaiting pickup. 已批准，等待取用
  | 'rejected'   // Admin rejected. 已拒绝
  | 'active'     // Item picked up, in use. 已取用，使用中
  | 'returned'   // Item returned successfully. 已归还
  | 'overdue'    // Past due date, not returned. 逾期未归还
  | 'cancelled'; // Cancelled by user. 用户取消

export type DamageSeverity = 'minor' | 'moderate' | 'severe';

export type DamageReportStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export type NotificationType = 
  | 'booking_approved' 
  | 'booking_rejected' 
  | 'return_reminder' 
  | 'overdue_alert' 
  | 'damage_reported' 
  | 'system';

// ============================================================
// INTERFACES (TABLES)
// ============================================================

export interface Profile {
  id: string; // UUID
  full_name: string;
  student_id: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  credit_score: number; // 0-200, default 100
  department: string | null;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface Category {
  id: string; // UUID
  name: string;
  name_zh: string | null;
  icon: string | null;
  description: string | null;
  created_at: string; // TIMESTAMPTZ
}

export interface Asset {
  id: string; // UUID
  category_id: string; // UUID
  created_by: string | null; // UUID
  name: string;
  description: string | null;
  serial_number: string | null;
  qr_code: string | null;
  condition: AssetCondition;
  status: AssetStatus;
  location: string | null;
  images: string[];
  warranty_status: WarrantyStatus;
  warranty_expiry: string | null; // DATE (e.g., 'YYYY-MM-DD')
  purchase_date: string | null; // DATE (e.g., 'YYYY-MM-DD')
  purchase_price: number | null; // DECIMAL
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

// Add Asset Form Payload (Omit auto-generated fields for frontend form)
export type CreateAssetPayload = Omit<
  Asset, 
  'id' | 'created_at' | 'updated_at' | 'created_by'
>;

export interface Booking {
  id: string; // UUID
  asset_id: string; // UUID
  borrower_id: string; // UUID
  approver_id: string | null; // UUID
  status: BookingStatus;
  start_date: string; // TIMESTAMPTZ
  end_date: string; // TIMESTAMPTZ
  actual_return_date: string | null; // TIMESTAMPTZ
  pickup_photo_url: string | null;
  return_photo_url: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface DamageReport {
  id: string; // UUID
  booking_id: string; // UUID
  asset_id: string; // UUID
  reporter_id: string; // UUID
  description: string;
  severity: DamageSeverity;
  photo_urls: string[];
  status: DamageReportStatus;
  resolution_notes: string | null;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface Notification {
  id: string; // UUID
  user_id: string; // UUID
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, any>; // JSONB
  created_at: string; // TIMESTAMPTZ
}

export interface Review {
  id: string; // UUID
  booking_id: string; // UUID
  reviewer_id: string; // UUID
  rating: number; // 1-5
  comment: string | null;
  created_at: string; // TIMESTAMPTZ
}
