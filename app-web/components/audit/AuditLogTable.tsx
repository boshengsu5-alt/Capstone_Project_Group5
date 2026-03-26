'use client';

import React, { useState } from 'react';
import type { AuditLogWithMeta } from '@/lib/auditService';
import {
    ScrollText, User, Package, ClipboardList, ShieldAlert,
    Info, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronRight,
} from 'lucide-react';

interface AuditLogTableProps {
    logs: AuditLogWithMeta[];
}

// ============================================================
// Badge / Icon Helpers. 标记和图标辅助函数
// ============================================================

function OperationBadge({ type }: { type: string }) {
    const cfg: Record<string, { icon: React.ReactNode; color: string }> = {
        CREATE:  { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
        UPDATE:  { icon: <Info className="w-3.5 h-3.5" />,         color: 'text-blue-400   bg-blue-500/10   border-blue-500/20'   },
        DELETE:  { icon: <XCircle className="w-3.5 h-3.5" />,      color: 'text-rose-400   bg-rose-500/10   border-rose-500/20'   },
        APPROVE: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
        REJECT:  { icon: <AlertTriangle className="w-3.5 h-3.5" />,color: 'text-amber-400  bg-amber-500/10  border-amber-500/20'  },
        VERIFY:  { icon: <ShieldAlert className="w-3.5 h-3.5" />,  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    };
    const { icon, color } = cfg[type] ?? { icon: <ScrollText className="w-3.5 h-3.5" />, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${color}`}>
            {icon}{type}
        </span>
    );
}

function ResourceIcon({ type }: { type: string }) {
    switch (type?.toLowerCase()) {
        case 'asset':         return <Package className="w-4 h-4 text-purple-400" />;
        case 'booking':       return <ClipboardList className="w-4 h-4 text-blue-400" />;
        case 'damage_report': return <ShieldAlert className="w-4 h-4 text-rose-400" />;
        default:              return <Info className="w-4 h-4 text-gray-400" />;
    }
}

// ============================================================
// Main Table. 主表格
// ============================================================

/**
 * Dark-themed expandable audit log table with asset thumbnails.
 * 暗色主题可展开审计日志表格，附带资产缩略图
 */
export default function AuditLogTable({ logs }: AuditLogTableProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (logs.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-900/40 rounded-2xl border border-white/5 backdrop-blur-sm">
                <ScrollText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-300 text-lg font-medium">No audit logs found</p>
                <p className="text-gray-500 text-sm mt-1">Administrative actions will appear here once they occur.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/40 backdrop-blur-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="w-8 py-4 pl-4" />
                            <th className="py-4 pr-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Time</th>
                            <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Operator</th>
                            <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                            <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Resource</th>
                            <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {logs.map((log) => {
                            const isExpanded = expandedId === log.id;
                            const metaEntries = Object.entries(log.metadata ?? {});
                            const ts = new Date(log.created_at);

                            return (
                                <React.Fragment key={log.id}>
                                    <tr
                                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                    >
                                        {/* Chevron */}
                                        <td className="py-4 pl-4 text-gray-500">
                                            {isExpanded
                                                ? <ChevronDown className="w-4 h-4" />
                                                : <ChevronRight className="w-4 h-4" />}
                                        </td>

                                        {/* Time */}
                                        <td className="whitespace-nowrap py-4 pr-3">
                                            <div className="text-sm text-gray-200">{ts.toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{ts.toLocaleTimeString()}</div>
                                        </td>

                                        {/* Operator */}
                                        <td className="whitespace-nowrap px-3 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-3 h-3 text-gray-400" />
                                                </div>
                                                <span className="text-sm text-gray-200 font-medium">{log.operator_name || 'System'}</span>
                                            </div>
                                        </td>

                                        {/* Action */}
                                        <td className="whitespace-nowrap px-3 py-4">
                                            <OperationBadge type={log.operation_type} />
                                        </td>

                                        {/* Resource — image + name */}
                                        <td className="px-3 py-4">
                                            <div className="flex items-center gap-3">
                                                {log._image_url ? (
                                                    <img
                                                        src={log._image_url}
                                                        alt=""
                                                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-gray-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                                                        <ResourceIcon type={log.resource_type} />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium text-white whitespace-nowrap">
                                                        {log.resource_name || 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 capitalize mt-0.5">
                                                        {log.resource_type?.replace(/_/g, ' ')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Description — truncated */}
                                        <td className="px-3 py-4 max-w-xs">
                                            <p className="text-sm text-gray-400 truncate" title={log.change_description}>
                                                {log.change_description}
                                            </p>
                                        </td>
                                    </tr>

                                    {/* ── Expanded detail row ── */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={6} className="p-0">
                                                <div className="px-6 py-5 bg-white/[0.02] border-t border-white/5 space-y-4">

                                                    {/* Full description */}
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                                            Full Description
                                                        </h4>
                                                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                            {log.change_description}
                                                        </p>
                                                    </div>

                                                    {/* Resource ID */}
                                                    {log.resource_id && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                                                Resource ID
                                                            </h4>
                                                            <span className="text-xs font-mono text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                                                                {log.resource_id}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Metadata key-value grid */}
                                                    {metaEntries.length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                                                Details
                                                            </h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                                {metaEntries.map(([key, value]) => (
                                                                    <div key={key} className="bg-white/5 border border-white/5 rounded-xl px-3 py-2.5">
                                                                        <div className="text-xs text-gray-500 capitalize mb-0.5">
                                                                            {key.replace(/_/g, ' ')}
                                                                        </div>
                                                                        <div className="text-sm text-gray-200 font-medium truncate">
                                                                            {String(value)}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
