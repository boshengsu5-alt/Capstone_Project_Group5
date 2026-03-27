import React, { useState, useRef, useEffect } from 'react';
import { useForm, type FieldError, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Tag, Hash, DollarSign, MapPin, AlignLeft, ShieldCheck, Asterisk, Upload, X, Loader2, Activity, Thermometer, Layers, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { createAsset, updateAsset } from '@/lib/assetService';
import { getCategories } from '@/lib/categoryService';
import { Asset, Category } from '@/types/database';
import { assetSchema, AssetFormData } from '@/lib/validations/asset';
import { cn } from '@/lib/utils';

interface AssetFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  asset?: Asset | null; // Used for edit mode
}

export default function AssetForm({ onCancel, onSuccess, asset }: AssetFormProps) {
  const isEditMode = !!asset;
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<string[]>(asset?.images ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Array<Pick<Category, 'id' | 'name' | 'name_zh'>>>([]);

  type CreateAssetPayload = Parameters<typeof createAsset>[0];
  type UpdateAssetPayload = Parameters<typeof updateAsset>[1];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema) as Resolver<AssetFormData>,
    defaultValues: {
      name: asset?.name || '',
      category_id: asset?.category_id || '',
      serial_number: asset?.serial_number || '',
      purchase_price: asset?.purchase_price || 0,
      location: asset?.location || '',
      description: asset?.description || '',
      condition: asset?.condition || 'good',
      status: asset?.status || 'available',
      quantity: 1,
    },
  });

  const [isFetchingCategories, setIsFetchingCategories] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        setIsFetchingCategories(true);
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setIsFetchingCategories(false);
      }
    }
    loadCategories();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    await uploadImages(Array.from(files));
  };

  const uploadImages = async (files: File[]) => {
    try {
      setIsUploading(true);

      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `assets/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('asset-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('asset-images')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setImages((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error('Upload error:', err);
      const msg = 'Failed to upload images. Please check your network connection.';
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const buildCreatePayload = (data: AssetFormData, nameOverride?: string): CreateAssetPayload => ({
    name: nameOverride ?? data.name,
    category_id: data.category_id,
    serial_number: data.serial_number || undefined,
    purchase_price: data.purchase_price,
    location: data.location || undefined,
    description: data.description || undefined,
    images: images || [],
  });

  const buildUpdatePayload = (data: AssetFormData): UpdateAssetPayload => ({
    name: data.name,
    category_id: data.category_id,
    serial_number: data.serial_number || null,
    purchase_price: data.purchase_price ?? 0,
    location: data.location || '',
    description: data.description || '',
    condition: data.condition,
    status: data.status,
    images: images || [],
  });

  const onSubmit = async (data: AssetFormData) => {
    try {
      if (isEditMode && asset) {
        await updateAsset(asset.id, buildUpdatePayload(data));
        showToast('Asset updated successfully!', 'success');
      } else {
        const quantity = data.quantity || 1;
        
        if (quantity > 1) {
          const promises: Array<Promise<Asset>> = [];
          for (let i = 1; i <= quantity; i++) {
            promises.push(createAsset(buildCreatePayload(data, `${data.name} #${i}`)));
          }
          await Promise.all(promises);
          showToast(`Successfully registered ${quantity} assets!`, 'success');
        } else {
          await createAsset(buildCreatePayload(data));
          showToast('Asset registered successfully!', 'success');
        }
      }
      onSuccess();
    } catch (err) {
      console.error('Asset form error:', err);
      const msg = err instanceof Error ? err.message : 'An error occurred while saving the asset.';
      showToast(msg, 'error');
    }
  };

  // Helper to render error message with fade-in
  const ErrorMessage = ({ error }: { error?: FieldError }) => {
    return (
      <div className="h-6 overflow-hidden">
        {error?.message && (
          <p className="mt-1 text-xs text-rose-500 font-medium animate-fade-in flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {error.message}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl shadow-2xl ring-1 ring-gray-900/10 sm:rounded-3xl border border-white/20 dark:border-gray-800/50 overflow-hidden transition-all duration-300">
      <div className="relative border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/20 dark:to-blue-900/20 px-8 py-8 sm:py-10">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-32 h-32 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold leading-7 text-gray-900 dark:text-white tracking-tight">
          {isEditMode ? 'Edit Asset Record' : 'Register New Asset'}
        </h3>
        <p className="mt-3 text-sm sm:text-base leading-6 text-gray-600 dark:text-gray-400 max-w-2xl">
          Enter the comprehensive details of the hardware to add it. Field marked with <span className="text-rose-500 font-bold">*</span> is mandatory.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="relative z-10">
        <div className="px-8 py-10 sm:px-12 sm:py-12">
          <div className="grid max-w-3xl grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-6 mx-auto">
            
            {/* Asset Name */}
            <div className="sm:col-span-4">
              <label htmlFor="name" className="flex items-center text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Asset Name <Asterisk className="w-3 h-3 text-rose-500 ml-1" />
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Package className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  id="name"
                  {...register('name')}
                  className={cn(
                    "block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm",
                    errors.name ? "ring-rose-500 focus:ring-rose-500" : "ring-gray-300 dark:ring-gray-700 focus:ring-indigo-600"
                  )}
                  placeholder="e.g. Dell XPS 15 9530"
                />
              </div>
              <ErrorMessage error={errors.name} />
            </div>

            {/* Quantity - Only for non-edit mode */}
            <div className={cn("sm:col-span-2", isEditMode && "hidden")}>
              <label htmlFor="quantity" className="flex items-center text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Quantity <Asterisk className="w-3 h-3 text-rose-500 ml-1" />
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Layers className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="number"
                  id="quantity"
                  {...register('quantity')}
                  className={cn(
                    "block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm",
                    errors.quantity ? "ring-rose-500 focus:ring-rose-500" : "ring-gray-300 dark:ring-gray-700 focus:ring-indigo-600"
                  )}
                  placeholder="1"
                />
              </div>
              <ErrorMessage error={errors.quantity} />
            </div>

            {/* Image Upload Area */}
            <div className="sm:col-span-6">
              <label className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 mb-2.5">
                Asset Images
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {images.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <img src={url} alt="asset preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                
                {isUploading && (
                  <div className="aspect-square rounded-xl border border-dashed border-indigo-400 flex flex-col items-center justify-center bg-indigo-50/10 dark:bg-indigo-900/10">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <span className="text-xs text-indigo-500 mt-2 font-medium">Uploading...</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all flex flex-col items-center justify-center group"
                >
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  <span className="text-xs text-gray-500 group-hover:text-indigo-500 mt-2 font-medium">Add Photo</span>
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                className="hidden"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload up to 4 clear photos of the asset. JPG, PNG are supported.
              </p>
            </div>

            {/* Category */}
            <div className="sm:col-span-3">
              <label htmlFor="category_id" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Category
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Tag className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <select
                  id="category_id"
                  {...register('category_id')}
                  disabled={isFetchingCategories}
                  className={cn(
                    "block w-full rounded-xl border-0 py-3.5 pl-12 pr-10 text-gray-900 dark:text-white ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm appearance-none cursor-pointer",
                    errors.category_id ? "ring-rose-500 focus:ring-rose-500" : "ring-gray-300 dark:ring-gray-700 focus:ring-indigo-600"
                  )}
                >
                  <option value="">Select a category...</option>
                  {isFetchingCategories ? (
                    <option disabled>Loading categories...</option>
                  ) : categories.length === 0 ? (
                    <option disabled value="">No categories available</option>
                  ) : (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {cat.name_zh ? `(${cat.name_zh})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <ErrorMessage error={errors.category_id} />
            </div>

            {/* Serial Number */}
            <div className="sm:col-span-3">
              <label htmlFor="serial_number" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Serial Number
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Hash className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  id="serial_number"
                  {...register('serial_number')}
                  className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm uppercase font-mono"
                  placeholder="SN-XXXX-YYYY"
                />
              </div>
              <ErrorMessage error={errors.serial_number} />
            </div>

            {/* Purchase Price */}
            <div className="sm:col-span-3">
              <label htmlFor="purchase_price" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Purchase Price
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="number"
                  id="purchase_price"
                  step="0.01"
                  {...register('purchase_price')}
                  className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm"
                  placeholder="0.00"
                />
              </div>
              <ErrorMessage error={errors.purchase_price} />
            </div>

            {/* Location */}
            <div className="sm:col-span-3">
              <label htmlFor="location" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Storage Location
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  id="location"
                  {...register('location')}
                  className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm"
                  placeholder="e.g. IT Department"
                />
              </div>
              <ErrorMessage error={errors.location} />
            </div>

            {/* Condition — only shown in edit mode */}
            {isEditMode && (
              <div className="sm:col-span-3">
                <label htmlFor="condition" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                  Condition
                </label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Thermometer className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <select
                    id="condition"
                    {...register('condition')}
                    className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm appearance-none"
                  >
                    <option value="new">New (全新)</option>
                    <option value="good">Good (良好)</option>
                    <option value="fair">Fair (一般)</option>
                    <option value="poor">Poor (较差)</option>
                    <option value="damaged">Damaged (损坏)</option>
                  </select>
                </div>
                <ErrorMessage error={errors.condition} />
              </div>
            )}

            {/* Status — only shown in edit mode */}
            {isEditMode && (
              <div className="sm:col-span-3">
                <label htmlFor="status" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                  Status
                </label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Activity className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <select
                    id="status"
                    {...register('status')}
                    className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm appearance-none"
                  >
                    <option value="available">Available (可借用)</option>
                    <option value="maintenance">Maintenance (维护中)</option>
                    <option value="retired">Retired (已退役)</option>
                  </select>
                </div>
                <ErrorMessage error={errors.status} />
              </div>
            )}

            {/* Description */}
            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Description & Notes
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute top-4 left-0 flex items-start pl-4">
                  <AlignLeft className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <textarea
                  id="description"
                  rows={4}
                  {...register('description')}
                  className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm resize-none"
                  placeholder="Additional specs, condition details, or notes..."
                />
              </div>
              <ErrorMessage error={errors.description} />
            </div>

          </div>
        </div>

        <div className="flex items-center justify-end gap-x-6 border-t border-gray-200/60 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30 px-8 py-6 sm:px-12 backdrop-blur-md">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting || isUploading}
            className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 px-5 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-indigo-500/30 transition-all duration-200 ease-out flex items-center justify-center min-w-[160px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" />
                Submitting...
              </>
            ) : isEditMode ? 'Update Asset Info' : 'Save Asset Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
