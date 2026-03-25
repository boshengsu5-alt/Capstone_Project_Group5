'use client';

import React, { useEffect, useState } from 'react';
import { bookingService, DamageReportWithDetails } from '@/lib/bookingService';
import DamageTable from '@/components/damage/DamageTable';
import { Download, ShieldAlert, RefreshCw } from 'lucide-react';
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
            setReports(data || []);
        } catch (error) {
            console.error('Failed to load damage reports:', error);
            showToast('Failed to load damage reports.', 'error');
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
            showToast('Report status updated', 'success');
            await loadReports();
        } catch (error) {
            console.error('Failed to update report status:', error);
            showToast('Failed to update report. Please try again.', 'error');
        }
    };

    const handleExport = () => {
        if (reports.length === 0) {
            showToast('No data to export', 'info');
            return;
        }
        const severityMap: Record<string, string> = { minor: '轻微', moderate: '中等', severe: '严重' };
        const exportData = reports.map(r => ({
            'Asset': r.assets?.name || 'N/A',
            'Reporter': r.profiles?.full_name || 'N/A',
            'Severity': severityMap[r.severity] || r.severity,
            'Description': r.description,
            'Status': r.status,
            'Notes': r.resolution_notes || '',
            'Date': new Date(r.created_at).toLocaleString(),
        }));
        try {
            exportToExcel(exportData, `Damage_Reports_${new Date().toISOString().split('T')[0]}`, 'Damage Reports');
            showToast('Report exported successfully', 'success');
        } catch {
            showToast('Export failed', 'error');
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
                            <h1 className="text-2xl font-bold text-white tracking-tight">Damage Reports & Claims</h1>
                        </div>
                        <p className="text-sm text-gray-500">
                            Manage equipment damage incidents, track repairs, and resolve student claims.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-900/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors shadow-sm backdrop-blur-sm"
                        >
                            <Download className="w-4 h-4" /> Export
                        </button>
                        <button
                            onClick={loadReports}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-900/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors shadow-sm disabled:opacity-50 backdrop-blur-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                {isLoading ? (
                    <div className="w-full h-64 flex flex-col items-center justify-center bg-gray-900/40 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-gray-400 font-medium">Loading incident reports...</p>
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
