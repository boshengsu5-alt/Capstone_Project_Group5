'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import AssetForm from '@/components/assets/AssetForm';
import { cn } from '@/lib/utils';
import { Asset } from '@/types/database';

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (error) {
      console.error('Failed to fetch assets', error);
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

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-gray-50 dark:bg-black overflow-y-auto">
      <Header />
      
      <main className="flex-1 p-6 sm:p-8">
        {!showForm ? (
          <>
            <div className="sm:flex sm:items-center mb-8">
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

            <div className="flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg dark:ring-white dark:ring-opacity-10">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Name</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Serial Number</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Price</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Location</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Condition</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Edit</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {isLoading ? (
                           <tr>
                             <td colSpan={7} className="text-center py-10 text-gray-500">Loading assets...</td>
                           </tr>
                        ) : assets.length === 0 ? (
                           <tr>
                             <td colSpan={7} className="text-center py-10 text-gray-500">No assets found. Click "Add new asset" to track your first item.</td>
                           </tr>
                        ) : (
                          assets.map((asset) => (
                          <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                              {asset.name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{asset.serial_number || 'N/A'}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">${asset.purchase_price}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{asset.location}</td>
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
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
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
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Add New Asset</h1>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Fill in the details below to catalog a new asset into the system.
                </p>
             </div>
             <AssetForm 
               onCancel={() => setShowForm(false)} 
               onSuccess={handleFormSuccess}
             />
          </div>
        )}
      </main>
    </div>
  );
}
