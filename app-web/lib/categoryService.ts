import { supabase } from './supabase';
import type { Category } from '@/types/database';

/**
 * Fetch all asset categories from the database.
 * 获取所有资产分类。
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching categories:', error.message);
    return [];
  }
}
