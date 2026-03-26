'use client';

import React, { useEffect, useState } from 'react';
import AuditLogTable from '@/components/audit/AuditLogTable';
import { auditService } from '@/lib/auditService';
import type { AuditLogWithMeta } from '@/lib/auditService';
import { useToast } from '@/components/ui/Toast';
import { ScrollText, RefreshCw } from 'lucide-react';

export default function AuditLogsPage() {
    const { showToast } = useToast();
    const [logs, setLogs] = useState<AuditLogWithMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const data = await auditService.getLogs();
            setLogs(data);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
            showToast('Failed to load audit logs.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    return (
        <div className="flex flex-col flex-1 h-full w-full bg-[#050505] text-gray-100 overflow-y-auto">
            <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <ScrollText className="w-5 h-5 text-gray-400" />
                            <h1 className="text-2xl font-bold text-white tracking-tight">Audit Logs</h1>
                        </div>
                        <p className="text-sm text-gray-500">
                            System-wide record of administrative actions and asset changes.
                        </p>
                    </div>
                    <button
                        onClick={loadLogs}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-900/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors shadow-sm disabled:opacity-50 backdrop-blur-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Main Content */}
                {isLoading ? (
                    <div className="w-full h-64 flex flex-col items-center justify-center bg-gray-900/40 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="w-8 h-8 border-4 border-gray-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-gray-400 font-medium">Loading activity history...</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <AuditLogTable logs={logs} />
                    </div>
                )}
            </main>
        </div>
    );
}
