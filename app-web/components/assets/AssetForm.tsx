import React, { useState, useRef } from 'react';
import { Package, Tag, Hash, DollarSign, MapPin, AlignLeft, ShieldCheck, Asterisk, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface AssetFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export default function AssetForm({ onCancel, onSuccess }: AssetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    serial_number: '',
    purchase_price: '',
    location: '',
    description: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    await uploadImages(Array.from(files));
  };

  const uploadImages = async (files: File[]) => {
    try {
      setIsUploading(true);
      setError(null);

      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `assets/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
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
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Failed to upload images. Please check if bucket "asset-images" is exists and public.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Asset name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          images
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save asset');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl shadow-2xl ring-1 ring-gray-900/10 sm:rounded-3xl border border-white/20 dark:border-gray-800/50 overflow-hidden transition-all duration-300">
      <div className="relative border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/20 dark:to-blue-900/20 px-8 py-8 sm:py-10">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-32 h-32 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold leading-7 text-gray-900 dark:text-white tracking-tight">Register New Asset</h3>
        <p className="mt-3 text-sm sm:text-base leading-6 text-gray-600 dark:text-gray-400 max-w-2xl">
          Enter the comprehensive details of the hardware to add it to the centralized management system. Fields marked with <span className="text-rose-500 font-bold">*</span> are mandatory.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10">
        <div className="px-8 py-10 sm:px-12 sm:py-12">
          <div className="grid max-w-3xl grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-6 mx-auto">
            
            {/* Asset Name */}
            <div className="sm:col-span-6">
              <label htmlFor="name" className="flex items-center text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Asset Name <Asterisk className="w-3 h-3 text-rose-500 ml-1" />
              </label>
              <div className="mt-2.5 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Package className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm"
                  placeholder="e.g. Dell XPS 15 9530"
                />
              </div>
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

            {/* Category ID */}
            <div className="sm:col-span-3">
              <label htmlFor="category_id" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Category Reference
              </label>
              <div className="mt-2.5 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Tag className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  name="category_id"
                  id="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm"
                  placeholder="UUID or leave auto"
                />
              </div>
            </div>

            {/* Serial Number */}
            <div className="sm:col-span-3">
              <label htmlFor="serial_number" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Serial Number
              </label>
              <div className="mt-2.5 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Hash className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  name="serial_number"
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm uppercase font-mono"
                  placeholder="SN-XXXX-YYYY"
                />
              </div>
            </div>

            {/* Purchase Price */}
            <div className="sm:col-span-3">
              <label htmlFor="purchase_price" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Purchase Price
              </label>
              <div className="mt-2.5 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="number"
                  name="purchase_price"
                  id="purchase_price"
                  step="0.01"
                  min="0"
                  value={formData.purchase_price}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Location */}
            <div className="sm:col-span-3">
              <label htmlFor="location" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Storage Location
              </label>
              <div className="mt-2.5 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  name="location"
                  id="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm"
                  placeholder="e.g. IT Department"
                />
              </div>
            </div>

            {/* Description */}
            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                Description & Notes
              </label>
              <div className="mt-2.5 relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute top-4 left-0 flex items-start pl-4">
                  <AlignLeft className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-all shadow-sm resize-none"
                  placeholder="Additional specs, condition details, or notes..."
                />
              </div>
            </div>

          </div>
        </div>

        {error && (
          <div className="px-8 py-4 mx-8 sm:mx-12 mb-8 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800">
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400 flex items-center">
               <span className="mr-2.5 flex-shrink-0 bg-rose-100 dark:bg-rose-800 rounded-full p-1">⚠️</span> 
               {error}
            </p>
          </div>
        )}

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
            className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-indigo-500/30 transition-all duration-200 ease-out flex items-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" />
                Processing...
              </>
            ) : 'Save Asset Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
