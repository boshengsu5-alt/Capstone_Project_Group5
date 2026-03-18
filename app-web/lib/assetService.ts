import { supabase } from '@/lib/supabase';
import type { Asset, AssetUpdate } from '@/types/database';
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
  const { data, error } = await db
    .from('assets')
    .select('*, categories(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching assets:', error);
    return [];
  }
  return data ?? [];
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
    const { data: categories } = await db
      .from('categories')
      .select('id')
      .limit(1);

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
    warranty_status: 'none' as const,
    images: formData.images ?? [],
  };

  const { data: insertedAsset, error } = await db
    .from('assets')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error('Error creating asset:', error);
    throw new Error(error.message);
  }

  // Audit log
  await auditService.logAction({
    operation_type: 'CREATE',
    resource_type: 'asset',
    resource_id: insertedAsset.id,
    resource_name: insertedAsset.name,
    change_description: `Created new asset: ${insertedAsset.name} in ${insertedAsset.location || 'unspecified location'}`
  });

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
    
    const { data: updatedAsset, error } = await db
      .from('assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating asset:', error);
      throw new Error(error.message);
    }

    // Audit log
    await auditService.logAction({
      operation_type: 'UPDATE',
      resource_type: 'asset',
      resource_id: id,
      resource_name: updatedAsset.name,
      change_description: `Updated asset fields: ${Object.keys(updates).join(', ')}`
    });

    return updatedAsset as Asset;
  } catch (err: any) {
    console.error('updateAsset service error:', err);
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
    // Get asset info first for logging
    const { data: asset } = await db
      .from('assets')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await db
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting asset:', error);
      throw new Error(error.message);
    }

    // Audit log
    if (asset) {
      await auditService.logAction({
        operation_type: 'DELETE',
        resource_type: 'asset',
        resource_id: id,
        resource_name: asset.name,
        change_description: `Deleted asset: ${asset.name}`
      });
    }

    return true;
  } catch (err: any) {
    console.error('deleteAsset service error:', err);
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
export async function getAssetReviews(assetId: string) {
  // First, get all booking IDs for this asset
  const { data: bookings, error: bookingsError } = await db
    .from('bookings')
    .select('id')
    .eq('asset_id', assetId);

  if (bookingsError || !bookings || bookings.length === 0) {
    return [];
  }

  const bookingIds = bookings.map((b: { id: string }) => b.id);

  // Then get all reviews for those bookings
  const { data: reviews, error: reviewsError } = await db
    .from('reviews')
    .select('*')
    .in('booking_id', bookingIds)
    .order('created_at', { ascending: false });

  if (reviewsError) {
    console.error('Error fetching asset reviews:', reviewsError);
    return [];
  }

  return reviews ?? [];
}
