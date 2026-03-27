import { z } from 'zod';

export const assetSchema = z.object({
  name: z.string().min(1, 'Asset name is required (资产名称不能为空)'),
  quantity: z.coerce
    .number()
    .int('Quantity must be an integer (数量必须是整数)')
    .positive('Quantity must be a positive integer (数量必须是正整数)')
    .min(1, 'Quantity must be at least 1 (数量至少为 1)'),
  category_id: z.string().min(1, 'Please select a category (分类必须选择)'),
  serial_number: z.string().optional(),
  purchase_price: z.coerce.number().min(0).optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  condition: z.enum(['new', 'good', 'fair', 'poor', 'damaged']).default('good'),
  status: z.enum(['available', 'borrowed', 'maintenance', 'retired']).default('available'),
});

export type AssetFormData = z.infer<typeof assetSchema>;
