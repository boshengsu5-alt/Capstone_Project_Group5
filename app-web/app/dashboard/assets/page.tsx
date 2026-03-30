// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { CalendarDays, ChevronDown, ChevronRight, Clock3, Download, FileText, Hash, MapPin, Package, QrCode, RefreshCw, Search, ShieldCheck, Tag } from 'lucide-react';
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
import { useAuth } from '@/components/providers/AuthContext';
import { getConditionLabel, getIntlLocale, getStatusLabel, getWarrantyLabel, localizeCategoryName } from '@/lib/i18n';

/** Asset row with joined category info from API response. */
type AssetWithCategory = Asset & {
  categories?: Pick<Category, 'id' | 'name'> | null;
};

function getAssetAgeLabel(purchaseDate: string, locale: string) {
  const ms = Date.now() - new Date(purchaseDate).getTime();
  const totalMonths = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44)));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (locale === 'zh') {
    if (years === 0) return `${months}个月`;
    if (months === 0) return `${years}年`;
    return `${years}年${months}个月`;
  }

  if (years === 0) return `${months}mo`;
  if (months === 0) return `${years}y`;
  return `${years}y ${months}mo`;
}

function getDepreciationRate(purchaseDate: string) {
  const years = (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years <= 1) return '100%';
  if (years <= 3) return '80%';
  if (years <= 5) return '50%';
  return '20%';
}

function formatAssetDate(value: string | null | undefined, locale: string, withTime = false) {
  if (!value) return null;
  const date = new Date(value);
  return withTime
    ? date.toLocaleString(getIntlLocale(locale))
    : date.toLocaleDateString(getIntlLocale(locale));
}

function AssetDetailItem({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className={cn('mt-3 text-sm font-medium text-white', mono && 'font-mono break-all')}>
        {value}
      </p>
    </div>
  );
}

export default function AssetsPage() {
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const { canManageAssets, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const getErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback;
  };

  // Guard: Only admins can access this page
  useEffect(() => {
    if (!authLoading && !canManageAssets) {
      router.replace('/dashboard/access-denied');
    }
  }, [authLoading, canManageAssets, router]);

  const [assets, setAssets] = useState<AssetWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetWithCategory | null>(null);
  const [selectedAssetForReview, setSelectedAssetForReview] = useState<{ id: string, name: string } | null>(null);
  const [selectedAssetForQR, setSelectedAssetForQR] = useState<AssetWithCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  // 状态卡片筛选：'all' | 'available' | 'borrowed' | 'maintenance'
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'available' | 'borrowed' | 'maintenance'>('all');
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<AssetWithCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDamageAssetIds, setPendingDamageAssetIds] = useState<string[]>([]);

  // Re-list modal state — for putting maintenance assets back to available (维护资产重新上架)
  const [assetToRelist, setAssetToRelist] = useState<AssetWithCategory | null>(null);
  const [isRelisting, setIsRelisting] = useState(false);

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const [data, pendingDamageIds] = await Promise.all([
        getAssets(),
        bookingService.getPendingDamageAssetIds(),
      ]);
      setAssets(data as AssetWithCategory[]);
      setPendingDamageAssetIds(pendingDamageIds);
    } catch (error) {
      console.error('Failed to fetch assets', error);
      showToast(getErrorMessage(error, t('assets.loadFailed')), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    if (expandedAssetId && !assets.some((asset) => asset.id === expandedAssetId)) {
      setExpandedAssetId(null);
    }
  }, [assets, expandedAssetId]);

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
      showToast(t('assets.archiveSuccess'), 'success');
      setAssetToDelete(null);
      fetchAssets();
    } catch (err) {
      console.error('Delete error:', err);
      const errorMessage = getErrorMessage(err, t('assets.loadFailed'));
      const isForbidden = errorMessage.includes('无法归档正在借出中的资产') || errorMessage.includes('borrowed');
      const isSchemaError = errorMessage.includes('column assets.is_archived does not exist');
      if (isSchemaError) {
        showToast(t('assets.schemaMismatch'), 'error');
      } else {
        showToast(errorMessage, isForbidden ? 'warning' : 'error');
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
      showToast(t('assets.cannotRelistPendingDamage'), 'warning');
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
      await bookingService.restoreMaintenanceBookings(assetToRelist.id);
      showToast(t('assets.relistSuccess', { name: assetToRelist.name, condition: getConditionLabel(condition, t) }), 'success');
      setAssetToRelist(null);
      fetchAssets();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('assets.cannotRelistPendingDamage');
      showToast(message, 'error');
    } finally {
      setIsRelisting(false);
    }
  };

  const handleExport = async () => {
    if (filteredAssets.length === 0) {
      showToast(t('assets.noDataToExport'), 'info');
      return;
    }
    const statusMap: Record<string, string> = {
      available: getStatusLabel('available', t), borrowed: getStatusLabel('borrowed', t),
      maintenance: getStatusLabel('maintenance', t), retired: getStatusLabel('retired', t),
    };
    const conditionMap: Record<string, string> = {
      new: getConditionLabel('new', t), good: getConditionLabel('good', t), fair: getConditionLabel('fair', t),
      poor: getConditionLabel('poor', t), damaged: getConditionLabel('damaged', t),
    };
    const warrantyMap: Record<string, string> = {
      none: getWarrantyLabel('none', t), active: getWarrantyLabel('active', t), expired: getWarrantyLabel('expired', t),
    };
    const exportData = filteredAssets.map((asset: AssetWithCategory) => ({
      [t('tables.name')]: asset.name,
      [t('tables.category')]: localizeCategoryName(asset.categories, locale),
      [t('tables.status')]: statusMap[asset.status] || asset.status,
      [t('tables.condition')]: conditionMap[asset.condition] || asset.condition,
      [t('tables.serial')]: asset.serial_number || t('common.none'),
      [t('tables.qrCode')]: asset.qr_code || t('common.none'),
      [t('tables.location')]: asset.location || t('common.none'),
      [t('tables.purchaseDate')]: asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString(getIntlLocale(locale)) : t('common.none'),
      [t('tables.warranty')]: warrantyMap[asset.warranty_status] || asset.warranty_status,
      [t('tables.warrantyExpiry')]: asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString(getIntlLocale(locale)) : t('common.none'),
      [t('assetForm.description')]: asset.description || t('common.none'),
      [t('tables.createdAt')]: new Date(asset.created_at).toLocaleString(getIntlLocale(locale)),
    }));
    const columnWidths = [25, 15, 20, 15, 20, 20, 20, 15, 15, 15, 30, 25];
    try {
      await exportToExcel(exportData, `UniGear_Assets_Report_${new Date().toISOString().split('T')[0]}`, t('assets.title'), columnWidths);
      showToast(t('assets.exportSuccess'), 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast(t('assets.exportFailed'), 'error');
    }
  };

  const categoriesMap = assets.reduce((acc: Record<string, string>, asset: AssetWithCategory) => {
    if (asset.categories) acc[asset.categories.id] = localizeCategoryName(asset.categories, locale);
    return acc;
  }, {} as Record<string, string>);
  const categoriesList = Object.entries(categoriesMap).map(([id, name]) => ({ id, name }));

  const filteredAssets = assets.filter((asset: AssetWithCategory) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || asset.category_id === selectedCategory;
    const matchesStatus = activeStatusFilter === 'all' || asset.status === activeStatusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // 统计卡片数据
  const totals = useMemo(() => ({
    total: assets.length,
    available: assets.filter(a => a.status === 'available').length,
    borrowed: assets.filter(a => a.status === 'borrowed').length,
    maintenance: assets.filter(a => a.status === 'maintenance').length,
  }), [assets]);

  const handleSearchChange = (v: string) => { setSearchQuery(v); };
  const handleCategoryChange = (v: string) => { setSelectedCategory(v); };

  const selectedCategoryLabel = selectedCategory === 'all'
    ? t('common.allCategories')
    : categoriesList.find((cat) => cat.id === selectedCategory)?.name || t('common.unknown');

  const activeFilterLabel = searchQuery || selectedCategoryLabel;

  if (!authLoading && !canManageAssets) return null;

  // ── 条件徽章映射
  const condBadge: Record<string, { color: string; label: string }> = {
    new:     { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: getConditionLabel('new', t) },
    good:    { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',         label: getConditionLabel('good', t) },
    fair:    { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',      label: getConditionLabel('fair', t) },
    poor:    { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',   label: getConditionLabel('poor', t) },
    damaged: { color: 'bg-red-500/10 text-red-400 border-red-500/20',            label: getConditionLabel('damaged', t) },
  };

  const handleToggleExpand = (assetId: string) => {
    setExpandedAssetId((current) => current === assetId ? null : assetId);
  };

  const renderExpandedDetail = (asset: AssetWithCategory) => {
    const purchaseDateText = formatAssetDate(asset.purchase_date, locale) ?? t('common.none');
    const createdAtText = formatAssetDate(asset.created_at, locale, true) ?? t('common.none');
    const updatedAtText = formatAssetDate(asset.updated_at, locale, true) ?? t('common.none');
    const warrantyExpiryText = formatAssetDate(asset.warranty_expiry, locale) ?? t('common.none');
    const assetAgeText = asset.purchase_date ? getAssetAgeLabel(asset.purchase_date, locale) : t('common.none');
    const depreciationText = asset.purchase_date ? getDepreciationRate(asset.purchase_date) : t('common.none');
    const purchasePriceText = asset.purchase_price != null ? `¥${asset.purchase_price.toLocaleString()}` : t('common.none');
    const categoryLabel = localizeCategoryName(asset.categories, locale);
    const statusLabel = getStatusLabel(asset.status, t);
    const conditionLabel = condBadge[asset.condition]?.label ?? getConditionLabel(asset.condition, t);
    const warrantyLabel = getWarrantyLabel(asset.warranty_status, t);
    const qrValueText = asset.qr_code || t('common.none');

    return (
      <div className="mx-4 mb-4 rounded-[28px] border border-white/10 bg-[#0B1120] p-5 shadow-[0_24px_70px_rgba(2,8,23,0.45)] sm:mx-6 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-4">
                {asset.images?.[0] ? (
                  <img
                    src={asset.images[0]}
                    alt={asset.name}
                    className="h-20 w-20 rounded-2xl border border-white/10 object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                    <Package className="h-8 w-8 text-gray-500" />
                  </div>
                )}

                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-300 ring-1 ring-white/10">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t('assets.detailOverview')}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{asset.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">{categoryLabel}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={cn(
                      'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                      asset.status === 'available' && 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
                      asset.status === 'borrowed' && 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
                      asset.status === 'maintenance' && 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
                      asset.status === 'retired' && 'bg-rose-500/10 text-rose-400 ring-rose-500/20',
                    )}>
                      {statusLabel}
                    </span>
                    <span className={cn('inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold border', condBadge[asset.condition]?.color)}>
                      {conditionLabel}
                    </span>
                  </div>
                </div>
              </div>

              {asset.qr_code && (
                <button
                  type="button"
                  onClick={() => setSelectedAssetForQR(asset)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.07]"
                >
                  <QrCode className="h-4 w-4" />
                  {t('dashboard.qrTooltip')}
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AssetDetailItem icon={Tag} label={t('tables.category')} value={categoryLabel} />
              <AssetDetailItem icon={Hash} label={t('tables.serial')} value={asset.serial_number || t('common.none')} mono />
              <AssetDetailItem icon={MapPin} label={t('tables.location')} value={asset.location || t('common.noLocation')} />
              <AssetDetailItem icon={CalendarDays} label={t('tables.purchaseDate')} value={purchaseDateText} />
              <AssetDetailItem icon={CalendarDays} label={t('assets.detailAge')} value={assetAgeText} />
              <AssetDetailItem icon={CalendarDays} label={t('assets.detailDepreciation')} value={depreciationText} />
              <AssetDetailItem icon={Package} label={t('tables.status')} value={statusLabel} />
              <AssetDetailItem icon={ShieldCheck} label={t('tables.condition')} value={conditionLabel} />
              <AssetDetailItem icon={Tag} label={t('tables.warranty')} value={warrantyLabel} />
              <AssetDetailItem icon={CalendarDays} label={t('tables.warrantyExpiry')} value={warrantyExpiryText} />
              <AssetDetailItem icon={QrCode} label={t('assets.detailQrValue')} value={qrValueText} mono />
              <AssetDetailItem icon={Package} label={t('tables.price')} value={purchasePriceText} />
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-gray-500">
              <Package className="h-4 w-4" />
              <span>{t('assets.detailImages')}</span>
            </div>

            {asset.images?.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {asset.images.map((imageUrl, index) => (
                  <button
                    key={`${asset.id}-image-${index}`}
                    type="button"
                    onClick={() => window.open(imageUrl, '_blank', 'noopener,noreferrer')}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-0.5 hover:border-indigo-400/40"
                  >
                    <img
                      src={imageUrl}
                      alt={`${asset.name} ${index + 1}`}
                      className="h-32 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-gray-500">
                {t('assets.detailNoImages')}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-gray-500">
              <FileText className="h-4 w-4" />
              <span>{t('assets.detailDescription')}</span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-4 text-sm leading-7 text-gray-300">
              {asset.description?.trim() || t('assets.detailNoDescription')}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-gray-500">
              <Clock3 className="h-4 w-4" />
              <span>{t('assets.detailHistory')}</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <AssetDetailItem icon={Clock3} label={t('tables.createdAt')} value={createdAtText} />
              <AssetDetailItem icon={Clock3} label={t('tables.updatedAt')} value={updatedAtText} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-[#050505] overflow-y-auto text-gray-100">
      <Header />

      <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-8 p-6 lg:p-10">
        {!showForm ? (
          <>
            {/* ── 页头 ── */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <div className="rounded-2xl bg-indigo-500/10 p-3">
                    <Package className="h-5 w-5 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">{t('assets.eyebrow')}</p>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{t('assets.title')}</h1>
                  </div>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-gray-400">
                  {t('assets.subtitle')}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start">
                <button
                  type="button"
                  onClick={fetchAssets}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.07] disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {t('common.refresh')}
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.07]"
                >
                  <Download className="h-4 w-4" />
                  {t('assets.exportBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  {t('assets.addBtn')}
                </button>
              </div>
            </div>

            {/* ── 统计卡片（可点击筛选）── */}
            <div className="grid gap-4 md:grid-cols-4">
              {([
                {
                  key: 'all' as const,
                  title: t('assets.totalAssetsCard'),
                  value: totals.total,
                  hint: t('assets.totalAssetsHint'),
                  base: 'border-white/5 bg-white/[0.03]',
                  active: 'border-violet-400/40 bg-violet-500/12 shadow-[0_0_0_1px_rgba(167,139,250,0.2)]',
                },
                {
                  key: 'available' as const,
                  title: t('assets.availableCard'),
                  value: totals.available,
                  hint: t('assets.availableHint'),
                  base: 'border-emerald-500/15 bg-emerald-500/5',
                  active: 'border-emerald-400/40 bg-emerald-500/12 shadow-[0_0_0_1px_rgba(52,211,153,0.18)]',
                },
                {
                  key: 'borrowed' as const,
                  title: t('assets.borrowedCard'),
                  value: totals.borrowed,
                  hint: t('assets.borrowedHint'),
                  base: 'border-sky-500/15 bg-sky-500/5',
                  active: 'border-sky-400/40 bg-sky-500/12 shadow-[0_0_0_1px_rgba(56,189,248,0.2)]',
                },
                {
                  key: 'maintenance' as const,
                  title: t('assets.maintenanceCard'),
                  value: totals.maintenance,
                  hint: t('assets.maintenanceHint'),
                  base: 'border-amber-500/15 bg-amber-500/5',
                  active: 'border-amber-400/40 bg-amber-500/12 shadow-[0_0_0_1px_rgba(251,191,36,0.18)]',
                },
              ] as const).map((card) => {
                const isActive = activeStatusFilter === card.key;
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => setActiveStatusFilter(card.key)}
                    className={[
                      'rounded-3xl border p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.06] cursor-pointer',
                      card.base,
                      isActive ? card.active : '',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-gray-500">{card.title}</p>
                      {isActive && (
                        <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-200">
                          {t('common.active')}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-4xl font-bold text-white">{card.value}</p>
                    <p className="mt-3 text-sm text-gray-500">{card.hint}</p>
                  </button>
                );
              })}
            </div>

            {/* ── 搜索栏 + 分类筛选 ── */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-2xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t('assets.searchPlh')}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-indigo-400 focus:bg-white/[0.06]"
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-200 outline-none transition focus:border-indigo-400 focus:bg-white/[0.06]"
                >
                  <option value="all">{t('common.allCategories')}</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <span className="whitespace-nowrap text-sm text-gray-400">
                  {t('assets.countLabel', { count: filteredAssets.length })}
                </span>
              </div>
            </div>

            {/* ── 资产列表 ── */}
            <div className="rounded-3xl border border-white/5 bg-white/[0.03] overflow-hidden">
              {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center">
                  <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
                  <p className="text-sm font-medium text-gray-400">{t('assets.loading')}</p>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4">
                  <div className="mb-4 rounded-2xl bg-white/[0.04] p-5">
                    <Package className="h-10 w-10 text-gray-600" />
                  </div>
                  <p className="text-base font-semibold text-gray-300 mb-1">
                    {assets.length === 0 ? t('assets.emptyTitle') : t('assets.emptyFilteredTitle')}
                  </p>
                  <p className="text-sm text-gray-500 text-center max-w-xs">
                    {assets.length === 0
                      ? t('assets.emptyDescription')
                      : t('assets.emptyFilteredDescription', { query: activeFilterLabel })}
                  </p>
                  {assets.length === 0 && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="mt-4 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
                    >
                      + {t('assets.addFirstAsset')}
                    </button>
                  )}
                </div>
              ) : (
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="w-12 py-4 pl-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
                        <span className="sr-only">{t('common.viewDetails')}</span>
                      </th>
                      <th className="py-4 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">{t('tables.name')}</th>
                      <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">{t('tables.qrCode')}</th>
                      <th className="hidden xl:table-cell px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">{t('tables.location')}</th>
                      <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">{t('tables.category')}</th>
                      <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">{t('tables.condition')}</th>
                      <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">{t('tables.status')}</th>
                      <th className="py-4 pl-3 pr-6 text-right text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">{t('tables.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredAssets.map((asset: AssetWithCategory) => {
                      const isExpanded = expandedAssetId === asset.id;
                      const conditionMeta = condBadge[asset.condition] ?? { color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', label: asset.condition };

                      return (
                        <React.Fragment key={asset.id}>
                          <tr
                            onClick={() => handleToggleExpand(asset.id)}
                            className={cn(
                              'group cursor-pointer transition hover:bg-white/[0.03]',
                              isExpanded && 'bg-violet-500/[0.05]'
                            )}
                          >
                            <td className="py-4 pl-4 text-gray-500">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] transition group-hover:text-white">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </div>
                            </td>

                            {/* 名称 + 图片 */}
                            <td className="whitespace-nowrap py-4 pl-6 pr-3">
                              <div className="flex items-center gap-3">
                                {asset.images?.[0] ? (
                                  <img src={asset.images[0]} alt={asset.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                                    <Package className="w-5 h-5 text-gray-600" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-white">{asset.name}</p>
                                  {asset.purchase_date && (() => {
                                    const ageLabel = getAssetAgeLabel(asset.purchase_date, locale);
                                    const deprLabel = getDepreciationRate(asset.purchase_date);
                                    return (
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {ageLabel} · {locale === 'zh' ? `折旧 ${deprLabel}` : `Depreciation ${deprLabel}`}
                                      </p>
                                    );
                                  })()}
                                </div>
                              </div>
                            </td>

                            {/* QR 缩略图 — 点击放大 */}
                            <td className="whitespace-nowrap px-3 py-4">
                              {asset.qr_code ? (
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedAssetForQR(asset);
                                  }}
                                  title={t('dashboard.qrTooltip')}
                                  className="group block rounded-lg bg-white p-1 shadow-sm hover:ring-2 hover:ring-violet-500/50 transition"
                                >
                                  <QRCodeSVG
                                    value={asset.qr_code}
                                    size={36}
                                    className="group-hover:scale-110 transition-transform duration-200"
                                  />
                                </button>
                              ) : (
                                <span className="text-xs text-gray-600">—</span>
                              )}
                            </td>

                            {/* 位置 */}
                            <td className="hidden xl:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-400">{asset.location || '-'}</td>

                            {/* 分类 */}
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{localizeCategoryName(asset.categories, locale)}</td>

                            {/* 成色 */}
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${conditionMeta.color}`}>
                                {conditionMeta.label}
                              </span>
                            </td>

                            {/* 状态 */}
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className={cn(
                                'inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize',
                                asset.status === 'available'   && 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
                                asset.status === 'borrowed'    && 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
                                asset.status === 'maintenance' && 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
                                asset.status === 'retired'     && 'bg-rose-500/10 text-rose-400 ring-rose-500/20',
                              )}>
                                {getStatusLabel(asset.status, t)}
                              </span>
                            </td>

                            {/* 操作按钮 */}
                            <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right">
                              <div className="flex items-center justify-end gap-3 text-sm font-medium">
                                {asset.status === 'maintenance' && (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleRelistClick(asset);
                                    }}
                                    disabled={pendingDamageAssetIds.includes(asset.id)}
                                    className={cn(
                                      'transition',
                                      pendingDamageAssetIds.includes(asset.id)
                                        ? 'cursor-not-allowed text-gray-500'
                                        : 'text-emerald-400 hover:text-emerald-300'
                                    )}
                                    title={
                                      pendingDamageAssetIds.includes(asset.id)
                                        ? t('assets.relistBlockedTooltip')
                                        : t('assets.relistTooltip')
                                    }
                                  >
                                    {pendingDamageAssetIds.includes(asset.id) ? t('assets.relistPending') : t('assets.relist')}
                                  </button>
                                )}

                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedAssetForReview({ id: asset.id, name: asset.name });
                                  }}
                                  className="text-amber-400 hover:text-amber-300 transition"
                                >
                                  {t('assets.reviews')}
                                </button>
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEdit(asset);
                                  }}
                                  className="text-indigo-400 hover:text-indigo-300 transition"
                                >
                                  {t('assets.edit')}
                                </button>
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setAssetToDelete(asset);
                                  }}
                                  className="text-rose-400 hover:text-rose-300 transition"
                                >
                                  {t('assets.archive')}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-transparent">
                              <td colSpan={8} className="p-0">
                                {renderExpandedDetail(asset)}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── 底部总数提示 ── */}
            {filteredAssets.length > 0 && (
              <p className="px-1 text-sm text-gray-500">
                {t('assets.showingAll', { count: filteredAssets.length })}
              </p>
            )}
          </>
        ) : (
          /* ── 新增/编辑表单 ── */
          <div className="max-w-4xl mx-auto w-full">
            <button
              onClick={() => { setShowForm(false); setEditingAsset(null); }}
              className="mb-6 text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-2 transition"
            >
              &larr; {t('assets.backToAssets')}
            </button>
            <AssetForm
              onCancel={() => { setShowForm(false); setEditingAsset(null); }}
              onSuccess={handleFormSuccess}
              asset={editingAsset}
            />
          </div>
        )}

        {/* ── 弹窗 ── */}
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
