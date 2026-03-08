'use client';

import React, { useState } from 'react';
import { Package, Tag, Hash, DollarSign, MapPin, AlignLeft } from 'lucide-react';

interface AssetFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export default function AssetForm({ onCancel, onSuccess }: AssetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    serial: '',
    price: '',
    location: '',
    description: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
          name: formData.name,
          category_id: formData.category_id || undefined, // Allow backend fallback
          serial: formData.serial,
          price: formData.price,
          location: formData.location,
          description: formData.description,
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
    <div className="bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
      <form onSubmit={handleSubmit}>
        <div className="px-4 py-6 sm:p-8">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            
            {/* Asset Name */}
            <div className="sm:col-span-6">
              <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                Asset Name <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">
                  <Package className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="block flex-1 border-0 bg-transparent py-1.5 pl-2 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="MacBook Pro 16&quot;"
                />
              </div>
            </div>

            {/* Category ID */}
            <div className="sm:col-span-3">
              <label htmlFor="category_id" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                Category
              </label>
              <div className="mt-2 flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">
                  <Tag className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  name="category_id"
                  id="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className="block flex-1 border-0 bg-transparent py-1.5 pl-2 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="Optional UUID (auto-assigned if blank)"
                />
              </div>
            </div>

            {/* Serial Number */}
            <div className="sm:col-span-3">
              <label htmlFor="serial" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                Serial Number
              </label>
              <div className="mt-2 flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">
                  <Hash className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  name="serial"
                  id="serial"
                  value={formData.serial}
                  onChange={handleInputChange}
                  className="block flex-1 border-0 bg-transparent py-1.5 pl-2 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="SN-123456789"
                />
              </div>
            </div>

            {/* Purchase Price */}
            <div className="sm:col-span-3">
              <label htmlFor="price" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                Purchase Price
              </label>
              <div className="mt-2 flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">
                  <DollarSign className="h-4 w-4" />
                </span>
                <input
                  type="number"
                  name="price"
                  id="price"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="block flex-1 border-0 bg-transparent py-1.5 pl-2 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Location */}
            <div className="sm:col-span-3">
              <label htmlFor="location" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                Location
              </label>
              <div className="mt-2 flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">
                  <MapPin className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  name="location"
                  id="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="block flex-1 border-0 bg-transparent py-1.5 pl-2 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="e.g. Server Room A"
                />
              </div>
            </div>

            {/* Description */}
            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                Description
              </label>
              <div className="mt-2 flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                <span className="flex select-none items-start pt-2.5 pl-3 text-gray-500 sm:text-sm">
                  <AlignLeft className="h-4 w-4" />
                </span>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="block flex-1 border-0 bg-transparent py-1.5 pl-2 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="Additional details about the asset..."
                />
              </div>
            </div>

          </div>
        </div>

        {error && (
          <div className="px-4 py-3 sm:px-8">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 dark:border-gray-800 px-4 py-4 sm:px-8">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Asset'}
          </button>
        </div>
      </form>
    </div>
  );
}
