import { supabase } from '@/lib/supabase';
import { Asset } from '@/types/database';

export async function getAssets() {
  const { data, error } = await supabase
    .from('assets')
    .select('*, categories(*)')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching assets:', error);
    return [];
  }
  return data;
}

export async function createAsset(data: any): Promise<Asset> {
  // 1. Resolve Category ID (Fallback to first available category if missing)
  let finalCategoryId = data.category_id;
  
  if (!finalCategoryId) {
    const { data: categories, error: catError } = await (supabase as any)
      .from('categories')
      .select('id')
      .limit(1);
      
    if (categories && categories.length > 0) {
      finalCategoryId = categories[0].id;
    } else {
      throw new Error("No categories found in database. Please seed categories first.");
    }
  }

  // 2. Map form fields to DB schema requirements map explicitly to purchase_price and serial_number
  const purchase_price = data.purchase_price ? Number(data.purchase_price) : 0;
  const serial_number = data.serial_number || null;
  const name = data.name;
  const location = data.location || null;
  const description = data.description || null;
  
  // 3. Auto-generated required enum/fields
  const status = 'available';
  const condition = 'new';
  const qr_code = crypto.randomUUID();

  // 4. Insert into database
  const insertPayload = {
    category_id: finalCategoryId,
    name,
    description,
    serial_number,
    qr_code,
    condition,
    status,
    location,
    purchase_price
  } as any;

  const { data: insertedAsset, error } = await (supabase as any)
    .from('assets')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error('Error creating asset:', error);
    throw new Error(error.message);
  }

  return insertedAsset as unknown as Asset;
}

export async function updateAsset(id: string, data: any): Promise<Asset | null> {
  console.log(`Mock updating asset ${id} with data:`, data);
  return {
    id,
    ...data,
    updated_at: new Date().toISOString()
  } as Asset;
}
