'use client';

import React, { useState } from 'react';
import { Package, Tag, Hash, DollarSign, MapPin, AlignLeft, ShieldCheck, Asterisk } from 'lucide-react';

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
    serial_number: '',
    purchase_price: '',
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
        body: JSON.stringify(formData),
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
            disabled={isSubmitting}
            className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 px-5 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-indigo-500/30 transition-all duration-200 ease-out flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : 'Save Asset Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
