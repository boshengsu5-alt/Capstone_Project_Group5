import { supabase } from './supabase';
import type { Asset, Category } from '../../../database/types/supabase';

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
    .ilike('name', `%${keyword}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as (Asset & { categories: Category })[];
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
