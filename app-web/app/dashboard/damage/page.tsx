'use client';

import React, { useEffect, useState } from 'react';
import { bookingService, DamageReportWithDetails } from '@/lib/bookingService';
import DamageTable from '@/components/damage/DamageTable';
import { Download } from 'lucide-react';
import { exportToExcel } from '@/lib/exportUtils';
import { useToast } from '@/components/ui/Toast';

export default function DamageReportsPage() {
    const { showToast } = useToast();
    const [reports, setReports] = useState<DamageReportWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadReports = async () => {
        setIsLoading(true);
        try {
            const data = await bookingService.getDamageReports();
            setReports(data);
        } catch (error) {
            console.error('Failed to load damage reports:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const handleUpdateStatus = async (id: string, status: string, notes: string) => {
        try {
            await bookingService.updateDamageReportStatus(id, status, notes);

            // Refresh data reflecting new status
            await loadReports();
        } catch (error) {
            console.error('Failed to update report status:', error);
            alert('Failed to update report. Please try again.');
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Damage Reports & Claims</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage equipment damage incidents, track repairs, and resolve student claims.
                    </p>
                </div>

                <div className="mt-4 md:mt-0 flex gap-3">
                    <button
                        onClick={() => {
                            if (reports.length === 0) { showToast('No data to export', 'info'); return; }
                            const severityMap: Record<string, string> = { minor: '轻微', moderate: '中等', severe: '严重' };
                            const exportData = reports.map(r => ({
                                '资产名称': r.assets?.name || 'N/A',
                                '报告人': r.profiles?.full_name || 'N/A',
                                '严重程度': severityMap[r.severity] || r.severity,
                                '描述': r.description,
                                '状态': r.status,
                                '处理备注': r.resolution_notes || '',
                                '报告时间': new Date(r.created_at).toLocaleString(),
                            }));
                            try {
                                exportToExcel(exportData, `损坏报告_${new Date().toISOString().split('T')[0]}`, '损坏报告');
                                showToast('报表导出成功', 'success');
                            } catch { showToast('导出失败', 'error'); }
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" /> 导出报表
                    </button>
                    <button
                        onClick={loadReports}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <span className={isLoading ? "animate-spin" : ""}>↻</span> Refresh
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {isLoading ? (
                <div className="w-full h-64 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading incident reports...</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                    <DamageTable reports={reports} onUpdateStatus={handleUpdateStatus} />
                </div>
            )}
        </div>
    );
}
