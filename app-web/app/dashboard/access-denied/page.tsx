'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function AccessDeniedPage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 animate-in fade-in zoom-in duration-300">
      <div className="mb-6 rounded-full border border-rose-400/20 bg-rose-500/10 p-4">
        <ShieldAlert className="h-16 w-16 text-rose-300" />
      </div>
      
      <h1 className="mb-3 text-center text-3xl font-bold text-white">
        {t('accessDenied.title')}
      </h1>
      
      <p className="mb-10 max-w-md text-center leading-relaxed text-[color:var(--dashboard-text-muted)]">
        {t('accessDenied.message')}
      </p>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 px-6 py-3 font-semibold text-[#120d05] transition-all hover:brightness-105"
        >
          <Home className="w-4 h-4" />
          {t('accessDenied.backDashboard')}
        </Link>
        
        <button
          onClick={() => window.history.back()}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 font-semibold text-gray-200 transition-all hover:bg-white/[0.07]"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('accessDenied.goBack')}
        </button>
      </div>
      
      <div className="mt-16 flex items-center gap-2 text-xs text-[color:var(--dashboard-text-muted)]">
        <div className="h-px w-8 bg-white/10"></div>
        {t('accessDenied.footer')}
        <div className="h-px w-8 bg-white/10"></div>
      </div>
    </div>
  );
}
