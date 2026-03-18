'use client';

import React from 'react';
import type { AuditLog } from '@/types/database';
import { cn } from '@/lib/utils';
import { ScrollText, User, Package, ClipboardList, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface AuditLogTableProps {
  logs: AuditLog[];
}

export default function AuditLogTable({ logs }: AuditLogTableProps) {
  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'CREATE': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'UPDATE': return <Info className="w-4 h-4 text-blue-500" />;
      case 'DELETE': return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'APPROVE': return <CheckCircle className="w-4 h-4 text-indigo-500" />;
      case 'REJECT': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <ScrollText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'asset': return <Package className="w-4 h-4 text-purple-400" />;
      case 'booking': return <ClipboardList className="w-4 h-4 text-blue-400" />;
      default: return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  if (logs.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <ScrollText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No audit logs found</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">System activities and administrative actions will appear here once they occur.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-400">Time</th>
              <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-400">Operator</th>
              <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-400">Action</th>
              <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-400">Resource</th>
              <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-400">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all border-b border-gray-100 dark:border-gray-800 group">
                <td className="px-6 py-4">
                  <div className="text-gray-900 dark:text-gray-200">{new Date(log.created_at).toLocaleDateString()}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{new Date(log.created_at).toLocaleTimeString()}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <User className="w-3 h-3 text-gray-500" />
                    </div>
                    <span className="text-gray-900 dark:text-gray-200 font-medium">{log.operator_name || 'System'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getOperationIcon(log.operation_type)}
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      log.operation_type === 'CREATE' && "text-emerald-600",
                      log.operation_type === 'UPDATE' && "text-blue-600",
                      log.operation_type === 'DELETE' && "text-rose-600",
                      log.operation_type === 'APPROVE' && "text-indigo-600",
                      log.operation_type === 'REJECT' && "text-amber-600"
                    )}>
                      {log.operation_type}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getResourceIcon(log.resource_type)}
                    <div>
                      <div className="text-gray-900 dark:text-gray-200 font-medium">{log.resource_name || 'N/A'}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs capitalize">{log.resource_type}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-600 dark:text-gray-400 max-w-xs truncate" title={log.change_description}>
                    {log.change_description}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
