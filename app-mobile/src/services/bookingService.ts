import { supabase } from './supabase';
import { getCurrentUser } from './authService';
import type { DamageSeverity } from '../../../database/types/supabase';

// 手写 Database 类型与 Supabase 客户端泛型不完全兼容，
// 用 db 别名统一绕过类型推断问题，运行时行为不受影响
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============================================================
// Booking Service — 借用管理服务
// ============================================================

/**
 * Check if the requested date range conflicts with existing bookings for an asset.
 * 检查请求的日期范围是否与该资产的现有预订冲突
 *
 * @param assetId - Asset to check. 要检查的资产 ID
 * @param startDate - Requested start date ISO string. 请求的开始日期
 * @param endDate - Requested end date ISO string. 请求的结束日期
 * @throws Error if date range overlaps with an active booking. 日期冲突时抛出错误
 */
async function checkBookingConflict(
  assetId: string,
  startDate: string,
  endDate: string
) {
  // 查询该资产所有有效预订（pending/approved/active），检测日期重叠
  // 重叠条件：existing.start < newEnd AND existing.end > newStart
  const { data, error } = await db
    .from('bookings')
    .select('id, start_date, end_date, status')
    .eq('asset_id', assetId)
    .in('status', ['pending', 'approved', 'active'])
    .lt('start_date', endDate)
    .gt('end_date', startDate);

  if (error) throw error;

  if (data && data.length > 0) {
    throw new Error('时间冲突：该设备在所选日期段内已被预订，请选择其他时间');
  }
}

/**
 * Create a new booking request (student submits reservation).
 * 创建借用请求（学生提交预约），状态初始为 pending。提交前自动检测时间冲突。
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
  const user = await getCurrentUser();

  // 先校验时间冲突，冲突时直接抛出错误拦截提交
  await checkBookingConflict(assetId, startDate, endDate);

  const { data, error } = await db
    .from('bookings')
    .insert({
      asset_id: assetId,
      borrower_id: user.id,
      start_date: startDate,
      end_date: endDate,
      status: 'pending',
      notes: notes ?? '',
      pickup_photo_url: '',
      return_photo_url: '',
      rejection_reason: '',
    })
    .select()
    .single();

  if (error) throw error;
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

  const { data, error } = await db
    .from('bookings')
    .select('*, assets(name, images)')
    .eq('borrower_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
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
 * 上传归还照片到 Supabase Storage
 */
export async function uploadReturnPhoto(photoUri: string, bookingId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  try {
    const response = await fetch(photoUri);
    const blob = await response.blob();
    const fileExt = photoUri.split('.').pop() || 'jpg';
    const fileName = `${user.id}/${bookingId}_${Date.now()}.${fileExt}`;

    // 假设 bucket 名称为 "returns" 或者可以叫 "return_photos"
    // User 的需求: 传给 Supabase 的大存储桶（Storage）。挂起等待系统返回一个网链串(URL)，存进 return_photo_url
    const { data, error } = await supabase.storage
      .from('returns')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('returns')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('上传归还照片失败:', error);
    throw new Error('照片上传失败，请重试');
  }
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
 * Trigger overdue booking detection via RPC (fallback for pg_cron).
 * 触发逾期检测 RPC 函数（pg_cron 免费版不可用时的兜底方案）
 */
export async function checkOverdueBookings() {
  const { error } = await db.rpc('check_overdue_bookings');
  if (error) throw error;
}
