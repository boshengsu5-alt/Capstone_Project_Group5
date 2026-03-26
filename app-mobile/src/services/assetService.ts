import { supabase } from './supabase';
import type { Asset, Category, ReviewReply } from '../../../database/types/supabase';

// 手写 Database 类型与 Supabase 客户端泛型不完全兼容，
// 用 db 别名统一绕过类型推断问题，运行时行为不受影响
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============================================================
// Asset Service — 资产查询服务
// ============================================================

/**
 * Get all assets with their category info. Optionally filter by category.
 * 获取所有资产及其分类信息，可按分类筛选
 *
 * @param categoryId - Optional category UUID to filter. 可选的分类 ID 筛选
 * @returns Array of assets with nested category data. 包含嵌套分类数据的资产数组
 */
export async function getAssets(categoryId?: string, page?: number, limit: number = 10): Promise<(Asset & { categories: Category })[]> {
  let query = db
    .from('assets')
    .select('*, categories(*)')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (page !== undefined) {
    const from = page * limit;
    query = query.range(from, from + limit - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  // Supabase 返回的 categories 是单个对象（外键关联），类型安全地断言
  return (data ?? []) as unknown as (Asset & { categories: Category })[];
}

/**
 * Get a single asset by ID with full details and category.
 * 根据 ID 获取单个资产的完整详情及分类
 *
 * @param assetId - Asset UUID. 资产 ID
 * @returns Asset with category or null. 资产详情或 null
 */
export async function getAssetById(assetId: string): Promise<(Asset & { categories: Category }) | null> {
  const { data, error } = await db
    .from('assets')
    .select('*, categories(*)')
    .eq('id', assetId)
    .single();

  if (error) throw error;
  return data as unknown as (Asset & { categories: Category }) | null;
}

/**
 * Get asset by QR code value (for scan-to-activate flow).
 * 根据二维码值查找资产（扫码取货流程）
 *
 * @param qrCode - QR code string from scanner. 扫描器读取的二维码字符串
 * @returns Matching asset or null. 匹配的资产或 null
 */
export async function getAssetByQrCode(qrCode: string): Promise<Asset | null> {
  const { data, error } = await db
    .from('assets')
    .select('*')
    .eq('qr_code', qrCode)
    .single();

  // PGRST116 = no rows found，不是错误，返回 null
  if (error && error.code !== 'PGRST116') throw error;
  return (data as unknown as Asset) ?? null;
}

/**
 * Get asset by serial number (for manual input flow).
 * 根据序列号查找资产（手动输入编号流程）
 *
 * @param serialNumber - Asset serial number string. 资产序列号字符串
 * @returns Matching asset or null. 匹配的资产或 null
 */
export async function getAssetBySerialNumber(serialNumber: string): Promise<Asset | null> {
  const { data, error } = await db
    .from('assets')
    .select('*')
    .ilike('serial_number', serialNumber)
    .single();

  // PGRST116 = no rows found，不是错误，返回 null
  if (error && error.code !== 'PGRST116') throw error;
  return (data as unknown as Asset) ?? null;
}

/**
 * Get all asset categories.
 * 获取所有资产分类
 *
 * @returns Array of categories. 分类数组
 */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await db
    .from('categories')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data ?? []) as unknown as Category[];
}

/**
 * Search assets by name (case-insensitive partial match).
 * 按名称搜索资产（不区分大小写的模糊匹配）
 *
 * @param keyword - Search keyword. 搜索关键词
 * @returns Matching assets with category. 匹配的资产列表
 */
export async function searchAssets(keyword: string): Promise<(Asset & { categories: Category })[]> {
  const { data, error } = await db
    .from('assets')
    .select('*, categories(*)')
    .eq('is_archived', false)
    .ilike('name', `%${keyword}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as (Asset & { categories: Category })[];
}

/**
 * Get all reviews for an asset (via its bookings).
 * 获取某资产的全部评价（通过关联的借用记录）
 *
 * @param assetId - Asset UUID. 资产 ID
 * @returns Reviews with reviewer info. 含评价人信息的评价列表
 */
export async function getReviewsByAssetId(assetId: string) {
  // 先获取该资产的所有 bookingId
  const { data: bookings, error: bErr } = await db
    .from('bookings')
    .select('id')
    .eq('asset_id', assetId);

  if (bErr) throw bErr;
  if (!bookings || bookings.length === 0) return [];

  const bookingIds = (bookings as { id: string }[]).map(b => b.id);

  // 同时 join profiles 获取 full_name 作为显示名
  const { data, error } = await db
    .from('reviews')
    .select('*, profiles!reviewer_id(full_name, email)')
    .in('booking_id', bookingIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  // 优先用 full_name，无则截取邮箱前缀
  return ((data ?? []) as unknown as (import('../../../database/types/supabase').Review & {
    profiles: { full_name: string | null; email: string } | null;
  })[]).map(r => ({
    ...r,
    reviewer_name: r.profiles?.full_name ?? r.profiles?.email?.split('@')[0] ?? '匿名用户',
  }));
}

/**
 * Get replies for a review.
 * 获取某条评价的所有回复
 *
 * @param reviewId - Review UUID. 评价 ID
 * @returns Replies ordered by creation time. 按时间排序的回复列表
 */
export async function getReviewReplies(reviewId: string): Promise<(ReviewReply & { author_name: string })[]> {
  // Step 1: 先拿回复列表（不做 FK join，因为 author_id FK 指向 auth.users 而非 profiles）
  const { data: replies, error } = await db
    .from('review_replies')
    .select('*')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!replies || replies.length === 0) return [];

  // Step 2: 批量拉取所有涉及的 author 显示名
  const authorIds = [...new Set((replies as ReviewReply[]).map(r => r.author_id))];
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, email')
    .in('id', authorIds);

  const profileMap = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null; email: string }[])
      .map(p => [p.id, p.full_name ?? p.email?.split('@')[0] ?? '用户'])
  );

  return (replies as ReviewReply[]).map(r => ({
    ...r,
    author_name: profileMap.get(r.author_id) ?? '用户',
  }));
}

/**
 * Post a reply to a review.
 * 向某条评价发布回复
 *
 * @param reviewId - Review UUID. 评价 ID
 * @param content - Reply text (1-500 chars). 回复内容
 */
export async function postReviewReply(reviewId: string, content: string): Promise<ReviewReply> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('请先登录');

  const { data, error } = await db
    .from('review_replies')
    .insert({ review_id: reviewId, author_id: user.id, content })
    .select()
    .single();

  if (error) throw error;

  // 发通知给评价原作者（不给自己发）
  try {
    const { data: review } = await db
      .from('reviews')
      .select('reviewer_id')
      .eq('id', reviewId)
      .single();

    if (review && review.reviewer_id !== user.id) {
      // 获取回复者显示名
      const { data: profile } = await db
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();
      const replierName = (profile as { full_name: string | null; email: string } | null)
        ?.full_name ?? (profile as { full_name: string | null; email: string } | null)
        ?.email?.split('@')[0] ?? '有人';

      await db.from('notifications').insert({
        user_id: (review as { reviewer_id: string }).reviewer_id,
        type: 'review_reply',
        title: '有人回复了你的评价',
        message: `${replierName} 追问：${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
        is_read: false,
        metadata: { review_id: reviewId, reply_author_id: user.id },
      });
    }
  } catch {
    // 通知发送失败不影响主流程
  }

  return data as unknown as ReviewReply;
}

/**
 * Get all active bookings for an asset (for calendar red-marking).
 * 查询某资产的所有有效预订，供日历组件标红已占用日期
 *
 * @param assetId - Asset UUID to query. 要查询预订的资产 ID
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
