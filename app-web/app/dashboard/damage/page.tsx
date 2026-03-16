'use client';

import React, { useEffect, useState } from 'react';
import { bookingService, DamageReportWithDetails } from '@/lib/bookingService';
import DamageTable from '@/components/damage/DamageTable';
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
            showToast('Failed to load damage reports. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const handleUpdateStatus = async (id: string, status: string, notes: string) => {
        try {
            const success = await bookingService.updateDamageReportStatus(id, status, notes);
            if (success) {
                showToast('报告状态已更新', 'success');
                // Refresh data reflecting new status
                await loadReports();
            } else {
                showToast('状态更新失败', 'error');
            }
        } catch (error) {
            console.error('Failed to update report status:', error);
            showToast('网络错误，请稍后再试', 'error');
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Damage Reports & Claims</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage equipment damage incidents, track repairs, and resolve student claims.
                    </p>
                </div>

                <div className="mt-4 md:mt-0 flex gap-3">
                    {/* Add summary badges or filters in the future */}
                    <button
                        onClick={loadReports}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <span className={isLoading ? "animate-spin" : ""}>↻</span> Refresh
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {isLoading ? (
                <div className="w-full h-64 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm">
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
