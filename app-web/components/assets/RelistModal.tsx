'use client';

import React, { useState } from 'react';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getConditionLabel } from '@/lib/i18n';
import { Asset } from '@/types/database';

interface RelistModalProps {
  asset: Asset;
  onConfirm: (condition: string) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

const CONDITIONS = [
  { value: 'new', color: 'text-emerald-500' },
  { value: 'good', color: 'text-blue-500' },
  { value: 'fair', color: 'text-amber-500' },
  { value: 'poor', color: 'text-orange-500' },
] as const;

/**
 * Modal for re-listing a maintenance asset. Admin selects the post-repair condition
 * and confirms to set the asset back to 'available'. (维护完成后重新上架弹窗)
 */
export default function RelistModal({ asset, onConfirm, onClose, isSubmitting }: RelistModalProps) {
  const { t } = useLanguage();
  const [selectedCondition, setSelectedCondition] = useState('good');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-gray-800">
        
        {/* Header */}
        <div className="h-24 bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center relative">
          <div className="absolute top-4 right-12 text-emerald-500 opacity-20">
            <RotateCcw className="w-16 h-16" />
          </div>
          <div className="p-4 bg-white dark:bg-gray-900 rounded-full shadow-lg ring-4 ring-emerald-50 dark:ring-emerald-900/20">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pt-6 pb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-center">
            {t('relistModal.title')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
            {t('relistModal.description', { name: asset.name })}
          </p>

          {/* Condition selector — pick post-repair condition before re-listing (选择维修后的设备状况) */}
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('relistModal.conditionLabel')}
          </label>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedCondition(c.value)}
                className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                  selectedCondition === c.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className={`text-sm font-bold ${selectedCondition === c.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                  {getConditionLabel(c.value, t)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t(`relistModal.conditions.${c.value}`)}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {t('relistModal.cancel')}
            </button>
            <button
              onClick={() => onConfirm(selectedCondition)}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('relistModal.submitting')}</span>
                </div>
              ) : (
                t('relistModal.confirm')
              )}
            </button>
          </div>
        </div>

        {/* Close */}
        <button 
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
