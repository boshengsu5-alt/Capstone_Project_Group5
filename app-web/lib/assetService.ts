import { query } from '@/lib/db';
import { Asset, CreateAssetPayload } from '@/types/database';

export async function getAssets() {
  const { rows } = await query('SELECT * FROM assets ORDER BY id DESC');
  return rows;
}

export async function createAsset(data: any): Promise<Asset> {
  // 1. Resolve Category ID (Fallback to first available category if missing)
  let finalCategoryId = data.category_id;
  
  if (!finalCategoryId) {
    const { rows: categories } = await query('SELECT id FROM categories LIMIT 1');
    if (categories.length > 0) {
      finalCategoryId = categories[0].id;
    } else {
      // In case no categories exist, we should ideally create a default one 
      // or throw an error. For safety, we throw an error requiring DB setup.
      throw new Error("No categories found in database. Please seed categories first.");
    }
  }

  // 2. Map form fields to DB schema requirements
  const purchase_price = data.price ? Number(data.price) : 0;
  const serial_number = data.serial || 'N/A';
  const name = data.name;
  const location = data.location || 'Unassigned';
  const description = data.description || null;
  
  // 3. Auto-generated required enum/fields
  const status = 'available';
  const condition = 'new';
  const qr_code = `QR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // 4. Insert into database
  const { rows } = await query(
    `INSERT INTO assets (
      category_id, 
      name, 
      description, 
      serial_number, 
      qr_code, 
      condition, 
      status, 
      location, 
      purchase_price
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      finalCategoryId,
      name,
      description,
      serial_number,
      qr_code,
      condition,
      status,
      location,
      purchase_price
    ]
  );

  return rows[0] as Asset;
}

export async function updateAsset(id: string, data: any): Promise<Asset | null> {
  // Placeholder for Day X: Update Asset Logic
  // Returning mock data for now as requested
  console.log(`Mock updating asset ${id} with data:`, data);
  return {
    id,
    ...data,
    updated_at: new Date().toISOString()
  } as Asset;
}
