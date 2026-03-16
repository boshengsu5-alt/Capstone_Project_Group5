'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import AssetForm from '@/components/assets/AssetForm';
import AssetReviewsModal from '@/components/assets/AssetReviewsModal';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { Asset, Category } from '@/types/database';
import { useToast } from '@/components/ui/Toast';

/** Asset row with joined category info from API response. API 响应中带分类信息的资产行 */
type AssetWithCategory = Asset & {
  categories?: Pick<Category, 'id' | 'name'> | null;
};

export default function AssetsPage() {
  const { showToast } = useToast();
  const [assets, setAssets] = useState<AssetWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedAssetForReview, setSelectedAssetForReview] = useState<{id: string, name: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      } else {
        showToast('无法获取资产列表，请检查网络', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch assets', error);
      showToast('网络连接中断 (Supabase Connection Error)', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchAssets();
  };

  // Derived state for filtering
  const categoriesMap = assets.reduce((acc: Record<string, string>, asset) => {
    if (asset.categories) {
      acc[asset.categories.id] = asset.categories.name;
    }
    return acc;
  }, {});
  const categories = Object.entries(categoriesMap).map(([id, name]) => ({ id, name }));
  
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (asset.serial_number && asset.serial_number.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // selectedCategory stores category_id now
    const matchesCategory = selectedCategory === 'All' || asset.category_id === selectedCategory;

    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-gray-50 dark:bg-black overflow-y-auto">
      <Header />
      
      <main className="flex-1 p-6 sm:p-8">
        {!showForm ? (
          <>
            <div className="sm:flex sm:items-center mb-6">
              <div className="sm:flex-auto">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Assets Dashboard</h1>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  A comprehensive list of all IT hardware and assets currently tracked.
                </p>
              </div>
              <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="block rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                >
                  Add new asset
                </button>
              </div>
            </div>

            {/* --- Search and Filter Section --- */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="w-full sm:max-w-md">
                <label htmlFor="search" className="sr-only">Search</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700 dark:placeholder-gray-500"
                    placeholder="Search by name or serial number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full sm:max-w-xs flex items-center gap-2">
                 <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Filter:</span>
                 <select
                  id="category"
                  name="category"
                  className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700 dark:focus:ring-indigo-500"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">全部分类</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg dark:ring-white dark:ring-opacity-10">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Name</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Serial Number</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">QR Code</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Price</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Location</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Category</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Condition</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {isLoading ? (
                           <tr>
                             <td colSpan={9} className="text-center py-10 text-gray-500">Loading assets...</td>
                           </tr>
                        ) : filteredAssets.length === 0 ? (
                           <tr>
                             <td colSpan={9} className="text-center py-10 text-gray-500">
                               {assets.length === 0 ? 'No assets found. Click "Add new asset" to track your first item.' : '未找到匹配资产'}
                             </td>
                           </tr>
                        ) : (
                          filteredAssets.map((asset) => (
                          <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                              {asset.name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono text-xs uppercase">{asset.serial_number || 'N/A'}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {asset.qr_code ? (
                                <div className="group relative w-10 h-10">
                                  <QRCodeSVG 
                                    value={asset.qr_code} 
                                    size={40} 
                                    className="cursor-pointer transition-transform duration-300 group-hover:scale-150 group-hover:z-10 relative bg-white p-1 rounded shadow-sm"
                                  />
                                </div>
                              ) : 'N/A'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">${asset.purchase_price ?? '0.00'}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{asset.location || '-'}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{asset.categories?.name || '-'}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 capitalize">{asset.condition}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize",
                                  asset.status === 'available' && "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20",
                                  asset.status === 'borrowed' && "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
                                  asset.status === 'maintenance' && "bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:ring-yellow-500/20",
                                  asset.status === 'retired' && "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20"
                                )}
                              >
                                {asset.status}
                              </span>
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex items-center justify-end gap-3">
                              <button 
                                onClick={() => setSelectedAssetForReview({ id: asset.id, name: asset.name })}
                                className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                              >
                                Reviews<span className="sr-only">, {asset.name}</span>
                              </button>
                              <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                Edit<span className="sr-only">, {asset.name}</span>
                              </button>
                            </td>
                          </tr>
                        ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
             <div className="mb-6">
                <button 
                  onClick={() => setShowForm(false)}
                  className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 mb-4 flex items-center gap-2"
                >
                  &larr; Back to Assets
                </button>
             </div>
             <AssetForm 
               onCancel={() => setShowForm(false)} 
               onSuccess={handleFormSuccess}
             />
          </div>
        )}

        {selectedAssetForReview && (
          <AssetReviewsModal 
            assetId={selectedAssetForReview.id}
            assetName={selectedAssetForReview.name}
            onClose={() => setSelectedAssetForReview(null)}
          />
        )}
      </main>
    </div>
  );
}
