import { supabase } from './supabase';

// Supabase 客户端的类型推断依赖 `supabase gen types typescript` 自动生成的精确格式。
// 当前 database/types/supabase.ts 为手写版本，部分泛型无法完美匹配。
// 使用 typedClient 统一绕过，待 Day 4 Bosheng 用 CLI 重新生成类型后可移除。
const db = supabase as any;

/**
 * 创建借用请求（学生提交预约）
 * 状态初始为 'pending'，等待管理员审批
 */
export async function createBooking(assetId: string, startDate: string, endDate: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const { data, error } = await db
    .from('bookings')
    .insert({
      asset_id: assetId,
      borrower_id: user.id,
      start_date: startDate,
      end_date: endDate,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 获取当前用户的所有借用记录
 */
export async function getMyBookings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const { data, error } = await db
    .from('bookings')
    .select('*, assets(name, images)')
    .eq('borrower_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * 取消借用请求（仅 pending / approved 状态可取消）
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
 * 归还资产（调用 RPC 函数，绕过 RLS）
 * Day 4 Bosheng 将在 Supabase 中创建 return_booking RPC 函数
 */
export async function returnAsset(bookingId: string, photoUrl: string) {
  const { data, error } = await db.rpc('return_booking', {
    p_booking_id: bookingId,
    p_photo_url: photoUrl,
  });

  if (error) throw error;
  return data;
}

/**
 * 提交损坏报修（学生可直接 INSERT damage_reports 表）
 */
export async function submitDamageReport(
  assetId: string,
  bookingId: string,
  description: string,
  severity: 'minor' | 'moderate' | 'severe',
  photoUrls: string[]
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

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
 * 查询某个资产的已有预订（用于日历标红）
 */
export async function getBookingsForAsset(assetId: string) {
  const { data, error } = await db
    .from('bookings')
    .select('start_date, end_date, status')
    .eq('asset_id', assetId)
    .in('status', ['pending', 'approved', 'active']);

  if (error) throw error;
  return data;
}

/**
 * 查询是否有已批准的取货预订
 */
export async function getApprovedBookingForPickup(assetId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('asset_id', assetId)
    .eq('borrower_id', user.id)
    .eq('status', 'approved')
    .order('start_date', { ascending: true }) // 找最近的一个
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // 未找到对应记录
    throw error;
  }
  return data;
}

/**
 * 激活预订（扫码取货）
 */
export async function activateBooking(bookingId: string) {
  const { data, error } = await db
    .from('bookings')
    .update({
      status: 'active',
      pickup_time: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
