'use client';

import React, { useEffect, useState } from 'react';
import { bookingService, DamageReportWithDetails } from '@/lib/bookingService';
import DamageTable from '@/components/damage/DamageTable';
import { Download, ShieldAlert, RefreshCw } from 'lucide-react';
import { exportToExcel } from '@/lib/exportUtils';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getDamageSeverityLabel } from '@/lib/i18n';

export default function DamageReportsPage() {
    const { t, locale } = useLanguage();
    const { showToast } = useToast();
    const [reports, setReports] = useState<DamageReportWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadReports = async () => {
        setIsLoading(true);
        try {
            const data = await bookingService.getDamageReports();
            setReports(data || []);
        } catch (error) {
            console.error('Failed to load damage reports:', error);
            showToast(t('damagePage.loadFailed'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUpdateStatus = async (id: string, status: string, notes: string, severity: string) => {
        try {
            await bookingService.updateDamageReportStatus(id, status, notes, severity);
            showToast(t('damagePage.updateSuccess'), 'success');
            await loadReports();
        } catch (error) {
            console.error('Failed to update report status:', error);
            showToast(t('damagePage.updateFailed'), 'error');
        }
    };

    const handleExport = () => {
        if (reports.length === 0) {
            showToast(t('damagePage.noDataToExport'), 'info');
            return;
        }
        const exportData = reports.map(r => ({
            [t('tables.asset')]: r.assets?.name || t('common.none'),
            [t('tables.borrower')]: r.bookings?.profiles?.full_name || r.profiles?.full_name || t('common.none'),
            [t('tables.severity')]: getDamageSeverityLabel(r.severity, t),
            [t('audit.description')]: r.description,
            [t('tables.status')]: r.status,
            [t('damageDetails.resNotes')]: r.resolution_notes || '',
            [t('tables.date')]: new Date(r.created_at).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US'),
        }));
        try {
            exportToExcel(exportData, `Damage_Reports_${new Date().toISOString().split('T')[0]}`, t('damagePage.exportSheet'));
            showToast(t('damagePage.exportSuccess'), 'success');
        } catch {
            showToast(t('damagePage.exportFailed'), 'error');
        }
    };

    return (
        <div className="flex flex-col flex-1 h-full w-full bg-[#050505] text-gray-100 overflow-y-auto">
            <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <ShieldAlert className="w-5 h-5 text-rose-400" />
                            <h1 className="text-2xl font-bold text-white tracking-tight">{t('damagePage.title')}</h1>
                        </div>
                        <p className="text-sm text-gray-500">
                            {t('damagePage.subtitle')}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-900/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors shadow-sm backdrop-blur-sm"
                        >
                            <Download className="w-4 h-4" /> {t('common.export')}
                        </button>
                        <button
                            onClick={loadReports}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-900/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors shadow-sm disabled:opacity-50 backdrop-blur-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            {t('common.refresh')}
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                {isLoading ? (
                    <div className="w-full h-64 flex flex-col items-center justify-center bg-gray-900/40 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-gray-400 font-medium">{t('damagePage.loading')}</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                        <DamageTable reports={reports} onUpdateStatus={handleUpdateStatus} />
                    </div>
                )}
            </main>
        </div>
    );
}
