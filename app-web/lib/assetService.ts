import { supabase } from '@/lib/supabase';
import type { Asset, AssetUpdate } from '@/types/database';
import { getCurrentUser } from './auth';
import { auditService } from './auditService';

// Supabase 泛型 Database 接口的 Relationships 定义不完整，导致 .from() 推断为 never
// 需要在查询处使用 eslint-disable 绕过，函数签名仍保持完整类型安全
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
// ============================================================
// Asset Query. 资产查询
// ============================================================

/** Fetch all assets with joined category info, ordered by newest first. 获取所有资产（含分类信息），按创建时间倒序 */
export async function getAssets(): Promise<Asset[]> {
  // 1. First attempt with Logical Delete filter
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*, categories(*)')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (!error) return (data as Asset[]) ?? [];

    // 2. If column missing, fallback to unfiltered list but log a LOUD warning
    if (error.message?.includes('column assets.is_archived does not exist')) {
      console.warn('⚠️ DATABASE SCHEMA OUT OF SYNC: is_archived column is missing. Please run the SQL migration.');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('assets')
        .select('*, categories(*)')
        .order('created_at', { ascending: false });
      
      if (fallbackError) throw fallbackError;
      return (fallbackData as Asset[]) ?? [];
    }

    throw error;
  } catch (error: any) {
    console.error('Fetch Error:', error.message, '| Details:', error.details || 'no details');
    return [];
  }
}

// ============================================================
// Asset Creation. 资产创建
// ============================================================

/** Form payload accepted by createAsset. 创建资产的表单载荷 */
interface CreateAssetFormData {
  name: string;
  category_id?: string;
  serial_number?: string;
  purchase_price?: string | number;
  purchase_date?: string;
  location?: string;
  description?: string;
  images?: string[];
}

/**
 * Create a new asset record. Auto-resolves category if omitted.
 * 创建新资产记录。未提供分类时自动回退到第一个可用分类。
 */
export async function createAsset(formData: CreateAssetFormData): Promise<Asset> {
  // 如果未传 category_id，回退到数据库中第一个分类
  let finalCategoryId = formData.category_id;

  if (!finalCategoryId) {
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
    
    const categories = categoriesData as Array<{ id: string }>;
    if (categories && categories.length > 0) {
      finalCategoryId = categories[0].id;
    } else {
      throw new Error('No categories found in database. Please seed categories first.');
    }
  }

  const insertPayload = {
    category_id: finalCategoryId,
    name: formData.name,
    description: formData.description || '',
    serial_number: formData.serial_number || null,
    qr_code: crypto.randomUUID(),
    condition: 'new' as const,
    status: 'available' as const,
    location: formData.location || '',
    purchase_price: formData.purchase_price ? Number(formData.purchase_price) : 0,
    purchase_date: formData.purchase_date || null,
    warranty_status: 'none' as const,
    images: formData.images ?? [],
  };

  const { data: insertedAssetData, error } = await (supabase as any)
    .from('assets')
    .insert([insertPayload])
    .select()
    .single();

  const insertedAsset = insertedAssetData as Asset | null;

  if (error) {
    console.error('Error creating asset:', error);
    throw new Error(error.message);
  }

  if (insertedAsset) {
    // Audit log
    await auditService.logAction({
      operation_type: 'CREATE',
      resource_type: 'asset',
      resource_id: insertedAsset.id,
      resource_name: insertedAsset.name,
      change_description: `Created new asset: ${insertedAsset.name} in ${insertedAsset.location || 'unspecified location'}`
    });
  }

  return insertedAsset as Asset;
}

// ============================================================
// Asset Update. 资产更新
// ============================================================

/**
 * Update an existing asset by ID.
 * 根据 ID 更新资产信息。
 */
export async function updateAsset(id: string, updates: AssetUpdate): Promise<Asset> {
  try {
    if (!id || !updates) throw new Error('ID and updates are required');
    
    const { data: updatedAssetData, error } = await (supabase as any)
      .from('assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    const updatedAsset = updatedAssetData as Asset | null;

    if (error) {
      throw new Error(error.message);
    }

    // Audit log
    if (updatedAsset) {
      await auditService.logAction({
        operation_type: 'UPDATE',
        resource_type: 'asset',
        resource_id: id,
        resource_name: updatedAsset.name,
        change_description: `Updated asset fields: ${Object.keys(updates).join(', ')}`
      });
    }

    return updatedAsset as Asset;
  } catch (err: any) {
    throw err;
  }
}

// ============================================================
// Asset Deletion. 资产删除
// ============================================================

/**
 * Delete an asset by ID.
 * 根据 ID 删除资产信息。
 */
export async function deleteAsset(id: string): Promise<boolean> {
  try {
    // Get asset info first — check status and get name for logging
    const { data: assetData } = await supabase
      .from('assets')
      .select('name, status')
      .eq('id', id)
      .single();
    
    const asset = assetData as { name: string; status: string } | null;

    // 🔒 Guard: forbid archival of borrowed assets (they must be returned first)
    if (asset?.status === 'borrowed') {
      throw new Error(
        '无法归档正在借出中的资产。请先完成归还流程后再操作。'
      );
    }

    // 🔄 Logical Delete: Use dedicated boolean column
    const { error } = await (supabase as any)
      .from('assets')
      .update({ 
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Archival Error:', error.message, '| Details:', error.details || 'no details');
      throw new Error(error.message);
    }

    // Audit log
    if (asset) {
      await auditService.logAction({
        operation_type: 'DELETE', // Keep type as DELETE or ARCHIVE for consistency
        resource_type: 'asset',
        resource_id: id,
        resource_name: asset.name,
        change_description: `Logical delete (Archived) asset: ${asset.name}`
      });
    }

    return true;
  } catch (err: any) {
    throw err;
  }
}

// ============================================================
// Asset Reviews. 资产评价
// ============================================================

/**
 * Get all reviews for a specific asset.
 * 获取特定资产的所有评价。
 *
 * @param assetId - The ID of the asset.
 * @returns List of reviews for this asset. 返回特定资产的评价列表。
 */
export type ReviewWithName = import('@/types/database').Review & {
  reviewer_name: string;
  reviewer_role?: string | null;
};
export type ReplyWithAuthor = import('@/types/database').ReviewReply & {
  author_name: string;
  author_role?: string | null;
};

export async function getAssetReviews(assetId: string): Promise<ReviewWithName[]> {
  const { data: bookings, error: bookingsError } = await db
    .from('bookings')
    .select('id')
    .eq('asset_id', assetId);

  if (bookingsError || !bookings || bookings.length === 0) return [];

  const bookingIds = (bookings as { id: string }[]).map((b) => b.id);

  const { data: reviews, error: reviewsError } = await db
    .from('reviews')
    .select('*')
    .in('booking_id', bookingIds)
    .order('created_at', { ascending: false });

  if (reviewsError || !reviews?.length) return [];

  // 批量拉取所有 reviewer 的 profile，获取真实姓名
  const reviewerIds = [...new Set((reviews as import('@/types/database').Review[]).map((r) => r.reviewer_id))];
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, email, role')
    .in('id', reviewerIds);

  const profileMap = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null; email: string; role?: string | null }[])
      .map((p) => [p.id, {
        name: p.full_name ?? p.email?.split('@')[0] ?? 'User',
        role: p.role ?? null,
      }])
  );

  return (reviews as import('@/types/database').Review[]).map((r) => ({
    ...r,
    reviewer_name: profileMap.get(r.reviewer_id)?.name ?? 'User',
    reviewer_role: profileMap.get(r.reviewer_id)?.role ?? null,
  }));
}

/** Get replies for a review with author names. 获取评价回复并附带作者姓名 */
export async function getReviewReplies(reviewId: string): Promise<ReplyWithAuthor[]> {
  const { data: replies, error } = await db
    .from('review_replies')
    .select('*')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });

  if (error || !replies?.length) return [];

  const authorIds = [...new Set((replies as import('@/types/database').ReviewReply[]).map((r) => r.author_id))];
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, email, role')
    .in('id', authorIds);

  const profileMap = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null; email: string; role?: string | null }[])
      .map((p) => [p.id, {
        name: p.full_name ?? p.email?.split('@')[0] ?? 'User',
        role: p.role ?? null,
      }])
  );

  return (replies as import('@/types/database').ReviewReply[]).map((r) => ({
    ...r,
    author_name: profileMap.get(r.author_id)?.name ?? 'User',
    author_role: profileMap.get(r.author_id)?.role ?? null,
  }));
}

/** Post a reply to a review as current admin. 以当前管理员身份回复评价 */
export async function postReviewReply(reviewId: string, content: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await db
    .from('review_replies')
    .insert({ review_id: reviewId, author_id: user.id, content });

  if (error) throw error;

  try {
    const { data: review } = await db
      .from('reviews')
      .select('reviewer_id, booking_id')
      .eq('id', reviewId)
      .single();

    if (!review || (review as { reviewer_id: string }).reviewer_id === user.id) return;

    const [{ data: profile }, { data: booking }] = await Promise.all([
      db
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', user.id)
        .single(),
      db
        .from('bookings')
        .select('asset_id, assets(name)')
        .eq('id', (review as { booking_id: string }).booking_id)
        .single(),
    ]);

    const profileData = profile as { full_name: string | null; email: string; role?: string | null } | null;
    const bookingData = booking as { asset_id?: string | null; assets?: { name?: string | null } | null } | null;
    const replierName = profileData?.full_name ?? profileData?.email?.split('@')[0] ?? 'Someone';
    const preview = content.trim().replace(/\s+/g, ' ').slice(0, 80);

    await db.from('notifications').insert({
      user_id: (review as { reviewer_id: string }).reviewer_id,
      type: 'review_reply',
      title: 'Review Reply',
      message: 'You have received a reply to your review.',
      is_read: false,
      metadata: {
        review_id: reviewId,
        booking_id: (review as { booking_id: string }).booking_id,
        asset_id: bookingData?.asset_id ?? null,
        asset_name: bookingData?.assets?.name ?? null,
        reply_author_id: user.id,
        reply_author_name: replierName,
        reply_author_role: profileData?.role ?? null,
        reply_preview: preview,
      },
    });
  } catch {
    // Notification delivery is best-effort and must not block the reply itself.
  }
}
