import { z } from 'zod';
import type { Translator } from '@/lib/i18n';

export function createAssetSchema(t: Translator) {
  return z.object({
    name: z.string().min(1, t('assetValidation.nameRequired')),
    quantity: z.coerce
      .number()
      .int(t('assetValidation.quantityInteger'))
      .positive(t('assetValidation.quantityPositive'))
      .min(1, t('assetValidation.quantityMin')),
    category_id: z.string().min(1, t('assetValidation.categoryRequired')),
    serial_number: z.string().optional(),
    purchase_price: z.coerce.number().min(0).optional(),
    purchase_date: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    condition: z.enum(['new', 'good', 'fair', 'poor', 'damaged']).default('good'),
    status: z.enum(['available', 'borrowed', 'maintenance', 'retired']).default('available'),
  });
}

export type AssetFormData = z.infer<ReturnType<typeof createAssetSchema>>;
