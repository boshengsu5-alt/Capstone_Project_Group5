'use client';

import React, { useEffect, useState } from 'react';
import AuditLogTable from '@/components/audit/AuditLogTable';
import { auditService } from '@/lib/auditService';
import { useToast } from '@/components/ui/Toast';
import { ScrollText, RefreshCw } from 'lucide-react';
import type { AuditLog } from '@/types/database';

export default function AuditLogsPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ScrollText className="w-5 h-5 text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Audit Logs</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            System-wide record of administrative actions and asset changes.
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <button
            onClick={() => loadLogs()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="w-full h-64 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading activity history...</p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AuditLogTable logs={logs} />
        </div>
      )}
    </div>
  );
}

// Helper for cn (copying if common utils not available or hard to import)
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
