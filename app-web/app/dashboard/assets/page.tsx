'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Plus, Search, Filter, QrCode, ClipboardList, Pencil, CheckCircle2, AlertCircle, Clock, Package, Eye, Trash2, Download } from 'lucide-react';
import { getAssets, deleteAsset, updateAsset } from '@/lib/assetService';
import { bookingService } from '@/lib/bookingService';
import RelistModal from '@/components/assets/RelistModal';
import AssetForm from '@/components/assets/AssetForm';
import AssetReviewsModal from '@/components/assets/AssetReviewsModal';
import QRCodeModal from '@/components/assets/QRCodeModal';
import DeleteAssetModal from '@/components/assets/DeleteAssetModal';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { Asset, Category } from '@/types/database';
import { useToast } from '@/components/ui/Toast';
import { exportToExcel } from '@/lib/exportUtils';
import { useLanguage } from '@/components/providers/LanguageProvider';

/** Asset row with joined category info from API response. */
type AssetWithCategory = Asset & {
  categories?: Pick<Category, 'id' | 'name'> | null;
};

export default function AssetsPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [assets, setAssets] = useState<AssetWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetWithCategory | null>(null);
  const [selectedAssetForReview, setSelectedAssetForReview] = useState<{ id: string, name: string } | null>(null);
  const [selectedAssetForQR, setSelectedAssetForQR] = useState<AssetWithCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [assetToDelete, setAssetToDelete] = useState<AssetWithCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Re-list modal state — for putting maintenance assets back to available (维护资产重新上架)
  const [assetToRelist, setAssetToRelist] = useState<AssetWithCategory | null>(null);
  const [isRelisting, setIsRelisting] = useState(false);

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const data = await getAssets();
      setAssets(data as AssetWithCategory[]);
    } catch (error: any) {
      console.error('Failed to fetch assets', error);
      showToast(error.message || 'Failed to load assets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAsset(null);
    fetchAssets();
  };

  const handleDeleteConfirmed = async () => {
    if (!assetToDelete) return;

    try {
      setIsDeleting(true);
      await deleteAsset(assetToDelete.id);
      showToast('Asset archived successfully!', 'success');
      setAssetToDelete(null);
      fetchAssets();
    } catch (err: any) {
      console.error('Delete error:', err);
      const isForbidden = err.message?.includes('无法归档正在借出中的资产') || err.message?.includes('borrowed');
      const isSchemaError = err.message?.includes('column assets.is_archived does not exist');

      if (isSchemaError) {
        showToast('Database Schema Mismatch: Please run the SQL migration (is_archived column missing).', 'error');
      } else {
        showToast(err.message || 'Failed to delete asset', isForbidden ? 'warning' : 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (asset: AssetWithCategory) => {
    setEditingAsset(asset);
    setShowForm(true);
  };

  // 点击 Re-list 按钮前先检查是否有未处理的损坏报告，有则阻止并提示
  const handleRelistClick = async (asset: AssetWithCategory) => {
    const hasPending = await bookingService.hasPendingDamageReports(asset.id);
    if (hasPending) {
      showToast('Cannot re-list: this asset still has open damage reports. Please resolve all damage reports first.', 'warning');
      return;
    }
    setAssetToRelist(asset);
  };

  // Re-list handler: update asset status→available & condition, then restore suspended bookings (重新上架处理)
  const handleRelist = async (condition: string) => {
    if (!assetToRelist) return;
    try {
      setIsRelisting(true);
      await updateAsset(assetToRelist.id, { status: 'available', condition: condition as Asset['condition'] });
      // 资产重新上架后，恢复/自动取消因维修暂停的预约并通知用户
      await bookingService.restoreMaintenanceBookings(assetToRelist.id);
      showToast(`"${assetToRelist.name}" has been re-listed as available (${condition}).`, 'success');
      setAssetToRelist(null);
      fetchAssets();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to re-list asset';
      showToast(message, 'error');
    } finally {
      setIsRelisting(false);
    }
  };

  const handleExport = () => {
    if (filteredAssets.length === 0) {
      showToast('No data to export', 'info');
      return;
    }

    const statusMap: Record<string, string> = {
      available: 'Available',
      borrowed: 'Borrowed',
      maintenance: 'Maintenance',
      retired: 'Retired',
    };

    const exportData = filteredAssets.map((asset: AssetWithCategory) => ({
      'Name': asset.name,
      'Category': asset.categories?.name || 'Uncategorized',
      'Status': statusMap[asset.status] || asset.status,
      'Serial Number': asset.serial_number || 'N/A',
      'Location': asset.location || 'N/A',
      'Purchase Date': asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'N/A',
    }));

    try {
      exportToExcel(exportData, `Assets_Report_${new Date().toISOString().split('T')[0]}`, 'Assets');
      showToast('Report exported successfully', 'success');
    } catch (error) {
      showToast('Export failed', 'error');
    }
  };

  const categoriesMap = assets.reduce((acc: Record<string, string>, asset: AssetWithCategory) => {
    if (asset.categories) {
      acc[asset.categories.id] = asset.categories.name;
    }
    return acc;
  }, {});
  const categoriesList = Object.entries(categoriesMap).map(([id, name]) => ({ id, name }));

  const filteredAssets = assets.filter((asset: AssetWithCategory) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(searchQuery.toLowerCase()));
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
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('assets.title')}</h1>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('assets.subtitle')}
                </p>
              </div>
              <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex gap-3">
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-center text-sm font-semibold text-gray-900 border border-gray-300 shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {t('assets.exportBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="block rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                  {t('assets.addBtn')}
                </button>
              </div>
            </div>

            {/* --- Search and Filter Section --- */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
              <div className="w-full sm:max-w-md">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700 dark:placeholder-gray-500"
                    placeholder={t('assets.searchPlh')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full sm:max-w-xs flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Filter:</span>
                <select
                  className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700 dark:focus:ring-indigo-500"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">{t('common.allCategories')}</option>
                  {categoriesList.map((cat) => (
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
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">{t('tables.name')}</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('tables.serial')}</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('tables.qrCode')}</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('tables.location')}</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('tables.category')}</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('tables.condition')}</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('tables.status')}</th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {isLoading ? (
                          <tr>
                            <td colSpan={8} className="text-center py-10 text-gray-500">Loading assets...</td>
                          </tr>
                        ) : filteredAssets.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-10 text-gray-500">
                              {assets.length === 0 ? 'No assets found. Click "Add new asset" to track your first item.' : 'No matching assets found'}
                            </td>
                          </tr>
                        ) : (
                          filteredAssets.map((asset: AssetWithCategory) => (
                            <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                <div className="flex items-center gap-3">
                                  {asset.images?.[0] ? (
                                    <img src={asset.images[0]} alt={asset.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                      <Package className="w-5 h-5 text-gray-400" />
                                    </div>
                                  )}
                                  <div>
                                    <span>{asset.name}</span>
                                    {asset.purchase_date && (() => {
                                      const ms = Date.now() - new Date(asset.purchase_date).getTime();
                                      const years = ms / (1000 * 60 * 60 * 24 * 365.25);
                                      const totalMonths = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
                                      const y = Math.floor(totalMonths / 12);
                                      const m = totalMonths % 12;
                                      const ageLabel = y === 0 ? `${m}个月` : m === 0 ? `${y}年` : `${y}年${m}个月`;
                                      const deprLabel = years <= 1 ? '100%' : years <= 3 ? '80%' : years <= 5 ? '50%' : '20%';
                                      return (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                          {ageLabel} · 折旧 {deprLabel}
                                        </p>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono text-xs uppercase">{asset.serial_number || 'N/A'}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                {asset.qr_code ? (
                                  <div
                                    className="group relative w-10 h-10 cursor-pointer"
                                    onClick={() => setSelectedAssetForQR(asset)}
                                    title="Click to view QR label"
                                  >
                                    <QRCodeSVG
                                      value={asset.qr_code}
                                      size={40}
                                      className="transition-transform duration-300 group-hover:scale-110 bg-white p-1 rounded shadow-sm hover:ring-2 hover:ring-purple-500/50"
                                    />
                                  </div>
                                ) : 'N/A'}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{asset.location || '-'}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{asset.categories?.name || '-'}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm">
                                {(() => {
                                  const condBadge: Record<string, { color: string; label: string }> = {
                                    new: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'New' },
                                    good: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Good' },
                                    fair: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Fair' },
                                    poor: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Poor' },
                                    damaged: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Damaged' },
                                  };
                                  const b = condBadge[asset.condition] ?? { color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', label: asset.condition };
                                  return (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${b.color}`}>
                                      {b.label}
                                    </span>
                                  );
                                })()}
                              </td>
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
                                {/* maintenance 资产显示重新上架按钮，让管理员修好设备后恢复 available (Re-list after repair) */}
                                {asset.status === 'maintenance' && (
                                  <button
                                    onClick={() => handleRelistClick(asset)}
                                    className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold"
                                  >
                                    Re-list
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedAssetForReview({ id: asset.id, name: asset.name })}
                                  className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                                >
                                  Reviews
                                </button>
                                <button
                                  onClick={() => handleEdit(asset)}
                                  className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setAssetToDelete(asset)}
                                  className="text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300"
                                >
                                  Archive
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
                onClick={() => {
                  setShowForm(false);
                  setEditingAsset(null);
                }}
                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 mb-4 flex items-center gap-2"
              >
                &larr; Back to Assets
              </button>
            </div>
            <AssetForm
              onCancel={() => {
                setShowForm(false);
                setEditingAsset(null);
              }}
              onSuccess={handleFormSuccess}
              asset={editingAsset}
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

        {selectedAssetForQR && (
          <QRCodeModal
            asset={selectedAssetForQR}
            onClose={() => setSelectedAssetForQR(null)}
          />
        )}

        {assetToDelete && (
          <DeleteAssetModal
            asset={assetToDelete}
            isDeleting={isDeleting}
            onConfirm={handleDeleteConfirmed}
            onClose={() => setAssetToDelete(null)}
          />
        )}

        {assetToRelist && (
          <RelistModal
            asset={assetToRelist}
            isSubmitting={isRelisting}
            onConfirm={handleRelist}
            onClose={() => setAssetToRelist(null)}
          />
        )}
      </main>
    </div>
  );
}
