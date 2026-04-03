'use client';

import React from 'react';
import {
  CalendarDays,
  Clock3,
  FileText,
  Hash,
  MapPin,
  Package,
  QrCode,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import type { Asset, Category } from '@/types/database';
import {
  getConditionLabel,
  getIntlLocale,
  getStatusLabel,
  getWarrantyLabel,
  localizeCategoryName,
} from '@/lib/i18n';

export type AssetWithCategory = Asset & {
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
    ? date.toLocaleString(getIntlLocale(locale as any))
    : date.toLocaleDateString(getIntlLocale(locale as any));
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

interface AssetDetailPanelProps {
  asset: AssetWithCategory;
  onOpenQr?: (asset: AssetWithCategory) => void;
  className?: string;
}

export default function AssetDetailPanel({ asset, onOpenQr, className }: AssetDetailPanelProps) {
  const { t, locale } = useLanguage();

  const purchaseDateText = formatAssetDate(asset.purchase_date, locale) ?? t('common.none');
  const createdAtText = formatAssetDate(asset.created_at, locale, true) ?? t('common.none');
  const updatedAtText = formatAssetDate(asset.updated_at, locale, true) ?? t('common.none');
  const warrantyExpiryText = formatAssetDate(asset.warranty_expiry, locale) ?? t('common.none');
  const assetAgeText = asset.purchase_date ? getAssetAgeLabel(asset.purchase_date, locale) : t('common.none');
  const depreciationText = asset.purchase_date ? getDepreciationRate(asset.purchase_date) : t('common.none');
  const purchasePriceText = asset.purchase_price != null ? `¥${asset.purchase_price.toLocaleString()}` : t('common.none');
  const categoryLabel = localizeCategoryName(asset.categories, locale);
  const statusLabel = getStatusLabel(asset.status, t);
  const conditionLabel = getConditionLabel(asset.condition, t);
  const warrantyLabel = getWarrantyLabel(asset.warranty_status, t);
  const qrValueText = asset.qr_code || t('common.none');

  return (
    <div className={cn('mx-4 mb-4 rounded-[28px] border border-white/10 bg-[#0B1120] p-5 shadow-[0_24px_70px_rgba(2,8,23,0.45)] sm:mx-6 sm:p-6', className)}>
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
                  <span className={cn(
                    'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold border',
                    asset.condition === 'new' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    asset.condition === 'good' && 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    asset.condition === 'fair' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    asset.condition === 'poor' && 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                    asset.condition === 'damaged' && 'bg-red-500/10 text-red-400 border-red-500/20',
                  )}>
                    {conditionLabel}
                  </span>
                </div>
              </div>
            </div>

            {asset.qr_code && onOpenQr && (
              <button
                type="button"
                onClick={() => onOpenQr(asset)}
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
}
