'use client';

import React from 'react';
import { Trash2, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { Asset } from '@/types/database';

interface DeleteAssetModalProps {
  asset: Asset;
  onConfirm: () => void;
  onClose: () => void;
  isDeleting: boolean;
}

export default function DeleteAssetModal({ asset, onConfirm, onClose, isDeleting }: DeleteAssetModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-gray-800">
        
        {/* Header/Banner with Warning Icon */}
        <div className="h-24 bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center relative">
          <div className="absolute top-4 right-4 text-rose-500 opacity-20">
            <Trash2 className="w-16 h-16" />
          </div>
          <div className="p-4 bg-white dark:bg-gray-900 rounded-full shadow-lg ring-4 ring-rose-50 dark:ring-rose-900/20">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pt-8 pb-10 text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Archive Asset?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 px-4">
            You are about to archive <span className="font-bold text-gray-900 dark:text-white">"{asset.name}"</span>. 
          </p>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-8 flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
              该资产有历史借用记录，将执行归档处理。归档后，该资产将不再出现在主列表中，但其审计日志和交易历史将被保留。
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-6 py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-6 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/30 transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-50"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Archiving...</span>
                </div>
              ) : (
                'Confirm Archive'
              )}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
