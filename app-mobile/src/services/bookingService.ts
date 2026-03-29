import { supabase } from './supabase';
import { getCurrentUser } from './authService';
import type { CompensationStatus, DamageReport, DamageSeverity } from '../../../database/types/supabase';
import { uploadFile } from './storageService';

// 手写 Database 类型与 Supabase 客户端泛型不完全兼容，
// 用 db 别名统一绕过类型推断问题，运行时行为不受影响
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type MyDamageReport = Pick<
  DamageReport,
  'id' | 'booking_id' | 'asset_id' | 'description' | 'severity' | 'photo_urls' | 'status'
>;

export type MyCompensationCaseSummary = {
  id: string;
  booking_id: string;
  status: CompensationStatus;
  assessed_amount: number | null;
  agreed_amount: number | null;
  paid_amount: number;
  created_at: string;
};

function normalizeBookingLostState<T extends {
  status: string;
  rejection_reason?: string | null;
  damage_reports?: Array<{ status: string; severity: string }> | null;
  end_date?: string | null;
  actual_return_date?: string | null;
}>(booking: T): T {
  const reports = Array.isArray(booking.damage_reports) ? booking.damage_reports : [];
  const hasUnresolvedLost = reports.some(
    (report) => report.severity === 'lost' && (report.status === 'open' || report.status === 'investigating')
  );
  const hasResolvedLost = reports.some(
    (report) => report.severity === 'lost' && report.status === 'resolved'
  );

  if (hasUnresolvedLost) {
    return {
      ...booking,
      status: 'lost_reported',
      rejection_reason: 'LOST_REPORTED',
    };
  }

  if (hasResolvedLost) {
    return {
      ...booking,
      status: 'lost',
      rejection_reason: 'LOST_CONFIRMED',
    };
  }

  if (booking.status === 'approved' && reports.length > 0) {
    const resumeStatus =
      booking.actual_return_date
        ? 'returned'
        : booking.end_date && new Date(booking.end_date).getTime() < Date.now()
          ? 'overdue'
          : 'active';

    return {
      ...booking,
      status: resumeStatus,
      rejection_reason: resumeStatus === 'returned' ? 'VERIFIED' : booking.rejection_reason ?? '',
    };
  }

  return booking;
}

// ============================================================
// Admin Notification Helper. 管理员通知辅助函数
// ============================================================

/**
 * Send a notification to all admin and staff users (fire-and-forget).
 * 向所有 admin/staff 用户发送通知（非关键路径，失败不影响主流程）
 */
async function notifyAdmins(
  type: string,
  title: string,
  message: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const { data: admins } = await db
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'staff']);

  if (!admins?.length) return;

  await db.from('notifications').insert(
    admins.map((a: { id: string }) => ({
      user_id: a.id,
      type,
      title,
      message,
      metadata,
    }))
  );
}

// ============================================================
// Booking Service — 借用管理服务
// ============================================================

/**
 * Create a new booking request atomically via RPC (student submits reservation).
 * 通过 RPC 原子化创建借用请求，从根本上防止"幽灵超卖"并发问题。
 *
 * 旧方案（已废弃）：客户端 SELECT 查冲突 → INSERT，两步之间存在竞态窗口。
 * 新方案：调用 create_booking() 数据库函数，内部用 FOR UPDATE 行锁保证
 * "冲突检查"和"INSERT"是同一事务内的原子操作，彻底消除竞态条件。
 *
 * @param assetId - Asset to book. 要借用的资产 ID
 * @param startDate - Booking start date ISO string. 借用开始日期
 * @param endDate - Booking end date ISO string. 借用结束日期
 * @param notes - Optional notes for the request. 可选的备注
 * @returns Created booking record. 创建的借用记录
 */
export async function createBooking(
  assetId: string,
  startDate: string,
  endDate: string,
  notes?: string
) {
  // 调用 SECURITY DEFINER RPC：内部持有 FOR UPDATE 锁，原子完成冲突检查 + 插入
  const { data: newBookingId, error } = await db.rpc('create_booking', {
    p_asset_id:   assetId,
    p_start_date: startDate,
    p_end_date:   endDate,
    p_notes:      notes ?? '',
  });

  if (error) throw new Error(error.message);

  // 用返回的 ID 拉取完整的借用记录（包含 asset 信息供 UI 使用）
  const { data, error: fetchError } = await db
    .from('bookings')
    .select('*, assets(name, images)')
    .eq('id', newBookingId)
    .single();

  if (fetchError) throw fetchError;

  // 通知所有管理员有新预约待审批
  notifyAdmins(
    'booking_pending',
    '📦 New Booking Request',
    `A new equipment booking request has been submitted and awaits approval.`,
    { booking_id: newBookingId, asset_id: assetId }
  ).catch(() => {});

  return data;
}

/**
 * Get current user's all booking records with asset info.
 * 获取当前用户的所有借用记录，包含资产信息
 *
 * @returns Array of bookings with nested asset data. 包含资产信息的借用记录数组
 */
export async function getMyBookings() {
  const user = await getCurrentUser();

  const { error: suspendedCheckError } = await db.rpc('check_suspended_maintenance_bookings');
  if (suspendedCheckError) {
    console.warn('Failed to run suspended maintenance booking check:', suspendedCheckError.message);
  }

  const { data, error } = await db
    .from('bookings')
    .select('*, assets(name, images), damage_reports(id, status, severity), compensation_cases(id, booking_id, status, assessed_amount, agreed_amount, paid_amount, created_at)')
    .eq('borrower_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Array<{
    status: string;
    rejection_reason?: string | null;
    damage_reports?: Array<{ status: string; severity: string }> | null;
  }>).map(normalizeBookingLostState);
}

export async function getMyDamageReportByBookingId(bookingId: string): Promise<MyDamageReport | null> {
  const user = await getCurrentUser();

  const { data, error } = await db
    .from('damage_reports')
    .select('id, booking_id, asset_id, description, severity, photo_urls, status')
    .eq('booking_id', bookingId)
    .eq('reporter_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as MyDamageReport | null;
}

export async function updateOwnDamageReport(
  reportId: string,
  description: string,
  severity: DamageSeverity,
  photoUrls: string[]
) {
  const { error } = await db.rpc('update_own_damage_report', {
    p_report_id: reportId,
    p_description: description,
    p_severity: severity,
    p_photo_urls: photoUrls,
  });

  if (error) throw error;
}

export async function withdrawOwnDamageReport(reportId: string) {
  const { error } = await db.rpc('withdraw_own_damage_report', {
    p_report_id: reportId,
  });

  if (error) throw error;
}

/**
 * Cancel a booking (only pending/approved can be cancelled).
 * 取消借用请求（仅 pending/approved 状态可取消）
 *
 * @param bookingId - Booking UUID to cancel. 要取消的借用 ID
 */
export async function cancelBooking(bookingId: string) {
  const { data, error } = await db
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Activate a booking via QR scan (approved → active). Calls SECURITY DEFINER RPC.
 * 扫码取货激活借用（approved → active），调用 RPC 函数绕过 RLS
 *
 * @param bookingId - The approved booking to activate. 要激活的已批准借用 ID
 */
export async function activateBooking(bookingId: string) {
  const { error } = await db.rpc('activate_booking', {
    p_booking_id: bookingId,
  });

  if (error) throw error;
}

/**
 * Upload a pickup condition photo to Supabase Storage.
 * 上传取货状况照片到 Supabase Storage (pickups bucket)
 *
 * @param photoUri - Local URI of the photo. 照片本地 URI
 * @param bookingId - The booking ID. 借用 ID
 * @param base64 - Optional base64 data for reliable upload. 可选 base64 数据
 * @returns Public URL of the uploaded photo. 上传后的公开 URL
 */
export async function uploadPickupPhoto(photoUri: string, bookingId: string, base64?: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const fileExt = photoUri.split('.').pop() || 'jpg';
  const fileName = `${user.id}/${bookingId}_${Date.now()}.${fileExt}`;

  return uploadFile('pickups', photoUri, fileName, base64);
}

/**
 * Save the pickup photo URL to the booking record via RPC.
 * 通过 RPC 将取货照片 URL 保存到借用记录
 *
 * @param bookingId - Booking to update. 要更新的借用 ID
 * @param photoUrl - Pickup condition photo URL from Storage. 取货照片 URL
 */
export async function savePickupPhoto(bookingId: string, photoUrl: string) {
  const { error } = await db.rpc('save_pickup_photo', {
    p_booking_id: bookingId,
    p_photo_url: photoUrl,
  });

  if (error) throw error;
}

/**
 * Upload a return photo to Supabase Storage.
 * 上传归还照片到 Supabase Storage (returns bucket)
 *
 * @param photoUri - Local URI of the photo to upload.
 * @param bookingId - The booking ID associated with this photo.
 * @returns Public URL of the uploaded photo.
 */
export async function uploadReturnPhoto(photoUri: string, bookingId: string, base64?: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const fileExt = photoUri.split('.').pop() || 'jpg';
  const fileName = `${user.id}/${bookingId}_${Date.now()}.${fileExt}`;

  return uploadFile('returns', photoUri, fileName, base64);
}

/**
 * Return an asset via RPC (active/overdue → returned). Calls SECURITY DEFINER RPC.
 * 归还资产，调用 RPC 函数（学生无权直接 UPDATE assets 表）
 *
 * @param bookingId - Booking to return. 要归还的借用 ID
 * @param photoUrl - Return condition photo URL from Storage. 归还照片 URL
 */
export async function returnAsset(bookingId: string, photoUrl: string) {
  const { error } = await db.rpc('return_booking', {
    p_booking_id: bookingId,
    p_photo_url: photoUrl,
  });

  if (error) throw error;

  // 通知管理员有归还待验证
  notifyAdmins(
    'return_submitted',
    '🔄 Return Awaiting Verification',
    `A borrower has submitted a return photo. Please verify the equipment condition.`,
    { booking_id: bookingId }
  ).catch(() => {});
}

/**
 * Submit a damage report (student can INSERT directly per RLS).
 * 提交损坏报修（RLS 允许学生直接 INSERT damage_reports）
 *
 * @param assetId - Damaged asset ID. 损坏的资产 ID
 * @param bookingId - Related booking ID. 关联的借用 ID
 * @param description - Damage description. 损坏描述
 * @param severity - Damage severity level. 损坏严重程度
 * @param photoUrls - Evidence photo URLs from Storage. 证据照片 URL 数组
 */
export async function submitDamageReport(
  assetId: string,
  bookingId: string,
  description: string,
  severity: DamageSeverity,
  photoUrls: string[]
) {
  const existingReport = await getMyDamageReportByBookingId(bookingId);

  if (existingReport) {
    if (existingReport.status !== 'open' && existingReport.status !== 'investigating') {
      if (existingReport.status !== 'dismissed') {
        throw new Error('该损坏报告已处理完成，不能重复提交');
      }
    } else {
      await updateOwnDamageReport(existingReport.id, description, severity, photoUrls);
      return {
        ...existingReport,
        asset_id: assetId,
        description,
        severity,
        photo_urls: photoUrls,
      };
    }
  }

  const user = await getCurrentUser();

  const { data, error } = await db
    .from('damage_reports')
    .insert({
      asset_id: assetId,
      booking_id: bookingId,
      reporter_id: user.id,
      description,
      severity,
      photo_urls: photoUrls,
    })
    .select()
    .single();

  if (error) throw error;

  // 通知管理员有新损坏报告
  notifyAdmins(
    'damage_reported',
    '⚠️ New Damage Report Filed',
    `A damage report has been submitted. Severity: ${severity}. Please review in the Damage Reports section.`,
    { booking_id: bookingId, asset_id: assetId, severity }
  ).catch(() => {});

  return data;
}

/**
 * Get all bookings for a specific asset (for calendar display).
 * 查询某资产的所有有效预订（供日历组件标红）
 *
 * @param assetId - Asset to query bookings for. 要查询的资产 ID
 * @returns Bookings with date range and status. 包含日期范围和状态的预订列表
 */
export async function getBookingsForAsset(assetId: string) {
  const { data, error } = await db
    .from('bookings')
    .select('id, start_date, end_date, status')
    .eq('asset_id', assetId)
    .in('status', ['pending', 'approved', 'active']);

  if (error) throw error;
  return data ?? [];
}

/**
 * Find user's approved booking for an asset (for scan-to-activate flow).
 * 查找用户对某资产的已批准借用（扫码取货流程）
 *
 * @param assetId - Asset scanned via QR code. 扫码识别的资产 ID
 * @returns Approved booking if exists, null otherwise. 已批准的借用记录或 null
 */
export async function findApprovedBookingForAsset(assetId: string) {
  const user = await getCurrentUser();

  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('asset_id', assetId)
    .eq('borrower_id', user.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Find user's pending booking for an asset (to prevent duplicate booking on re-scan).
 * 查找用户对某资产的待审批借用（防止重复扫码时重复预约）
 *
 * @param assetId - Asset scanned via QR code. 扫码识别的资产 ID
 * @returns Pending booking if exists, null otherwise. 待审批的借用记录或 null
 */
export async function findPendingBookingForAsset(assetId: string) {
  const user = await getCurrentUser();

  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('asset_id', assetId)
    .eq('borrower_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Find user's suspended booking for an asset (device under maintenance).
 * 查找用户对某资产的已暂停借用（设备进入维修状态时触发）
 *
 * @param assetId - Asset scanned via QR code. 扫码识别的资产 ID
 * @returns Suspended booking if exists, null otherwise. 暂停中的借用记录或 null
 */
export async function findSuspendedBookingForAsset(assetId: string) {
  const user = await getCurrentUser();

  const { error: suspendedCheckError } = await db.rpc('check_suspended_maintenance_bookings');
  if (suspendedCheckError) {
    console.warn('Failed to run suspended maintenance booking check:', suspendedCheckError.message);
  }

  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('asset_id', assetId)
    .eq('borrower_id', user.id)
    .eq('status', 'suspended')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Trigger overdue booking detection via RPC (fallback for pg_cron).
 * 触发逾期检测 RPC 函数（pg_cron 免费版不可用时的兜底方案）
 */
export async function checkOverdueBookings() {
  const { error } = await db.rpc('check_overdue_bookings');
  if (error) throw error;
}

/**
 * Submit a review for a completed booking.
 * 为已完成的借用提交评价
 *
 * @param bookingId - The booking ID to review. 借用 ID
 * @param rating - Star rating (1-5). 星级评分
 * @param comment - Review text. 评价内容
 */
export async function submitReview(bookingId: string, rating: number, comment: string) {
  const user = await getCurrentUser();

  const { data, error } = await db
    .from('reviews')
    .insert({
      booking_id: bookingId,
      reviewer_id: user.id,
      rating,
      comment,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get the existing review for a booking, if any.
 * 获取某借用的已有评价（若存在）
 *
 * @param bookingId - Booking UUID. 借用 ID
 * @returns Review or null. 评价对象或 null
 */
export async function getReviewByBookingId(bookingId: string) {
  const { data, error } = await db
    .from('reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .single();

  // PGRST116 = no rows found，不是错误
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

/**
 * Update an existing review (rating and/or comment).
 * 更新已有评价的星级或内容
 *
 * @param reviewId - Review UUID. 评价 ID
 * @param rating - New star rating. 新星级
 * @param comment - New comment text. 新评价内容
 */
export async function updateReview(reviewId: string, rating: number, comment: string) {
  const { data, error } = await db
    .from('reviews')
    .update({ rating, comment })
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
