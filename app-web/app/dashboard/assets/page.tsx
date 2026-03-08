'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export default function DashboardPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    serial: '',
    price: '',
    location: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

const handleSave = async () => {
    if (!formData.name.trim()) return;

    try {
      // 1. 核心修复：手动对齐 001 脚本的字段名
      const payload = {
        name: formData.name,
        // 先去数据库查一个分类 ID 填上，或者这里先填一个你数据库里有的 UUID
        // 如果不填 category_id，这里 100% 会报错
        category_id: "你在 categories 表里看到的任意一个 UUID", 
        purchase_price: parseFloat(formData.price) || 0,
        serial_number: formData.serial || `SN-${Date.now()}`,
        location: formData.location || 'Unassigned',
        condition: 'good', // 必须是枚举值之一
        status: 'available', // 必须是枚举值之一
        qr_code: `QR-${Date.now()}` // 必填唯一码
      };

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchAssets();
        setIsModalOpen(false);
        setFormData({ name: '', type: '', serial: '', price: '', location: '' });
      } else {
        // 重要：让浏览器打印出后端到底在烦什么
        const errorDetail = await res.json();
        console.error('数据库拒绝理由:', errorDetail);
        alert(`保存失败：${errorDetail.details || '字段不匹配'}`);
      }
    } catch (error) {
      console.error('网络或服务器错误:', error);
    }
  };
  
  return (
    <>
      <div>
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Assets Dashboard</h1>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              A list of all tracking assets including their name, type, serial number, price, location, and status.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
            >
              Add asset
            </button>
          </div>
        </div>
        
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg dark:ring-white dark:ring-opacity-10">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Name</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Serial Number</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Price</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Location</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                          {asset.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{asset.type}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{asset.serial}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">${asset.price}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{asset.location}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                              asset.status === 'available' && "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20",
                              asset.status === 'busy' && "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
                              asset.status === 'broken' && "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20"
                            )}
                          >
                            {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <a href="#" className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                            Edit<span className="sr-only">, {asset.name}</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Asset Modal */}
      {isModalOpen && (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Background backdrop */}
          <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity backdrop-blur-sm" />

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              {/* Modal panel */}
              <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 border border-gray-200 dark:border-gray-800">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <h3 className="text-xl font-semibold leading-6 text-gray-900 dark:text-white" id="modal-title">
                      Add New Asset
                    </h3>
                    <div className="mt-6 flow-root w-full">
                      <form className="flex flex-col gap-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                            Asset Name <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-2">
                            <input
                              type="text"
                              name="name"
                              id="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 dark:text-white dark:bg-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                              placeholder="e.g. MacBook Pro 16&quot;"
                            />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label htmlFor="type" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                              Type
                            </label>
                            <div className="mt-2">
                              <input
                                type="text"
                                name="type"
                                id="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 dark:text-white dark:bg-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                placeholder="e.g. Laptop"
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <label htmlFor="serial" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                              Serial Number
                            </label>
                            <div className="mt-2">
                              <input
                                type="text"
                                name="serial"
                                id="serial"
                                value={formData.serial}
                                onChange={handleInputChange}
                                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 dark:text-white dark:bg-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                placeholder="e.g. SN-12345"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label htmlFor="price" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                              Price ($)
                            </label>
                            <div className="mt-2">
                              <input
                                type="number"
                                name="price"
                                id="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 dark:text-white dark:bg-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <label htmlFor="location" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                              Location
                            </label>
                            <div className="mt-2">
                              <input
                                type="text"
                                name="location"
                                id="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 dark:text-white dark:bg-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                placeholder="e.g. IT Dept"
                              />
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse sm:px-4">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto transition-colors"
                    onClick={handleSave}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 sm:w-auto transition-colors"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
