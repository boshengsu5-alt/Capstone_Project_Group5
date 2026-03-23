'use client';

import React, { useState } from 'react';
import { DamageReportWithDetails } from '@/lib/bookingService';
import { AlertTriangle, Clock, CheckCircle2, XCircle, Info, ExternalLink } from 'lucide-react';

interface DamageTableProps {
    reports: DamageReportWithDetails[];
    onUpdateStatus: (id: string, status: string, notes: string) => Promise<void>;
}

export default function DamageTable({ reports, onUpdateStatus }: DamageTableProps) {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');

    const toggleRow = (id: string) => {
        if (expandedRow === id) {
            setExpandedRow(null);
            setResolvingId(null);
        } else {
            setExpandedRow(id);
            const report = reports.find(r => r.id === id);
            setNotes(report?.resolution_notes || '');
        }
    };

    const handleSave = async (id: string, status: string) => {
        await onUpdateStatus(id, status, notes);
        setResolvingId(null);
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'minor': return <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium border border-yellow-200">Minor</span>;
            case 'moderate': return <span className="px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs font-medium border border-orange-200">Moderate</span>;
            case 'severe': return <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-medium border border-red-200">Severe</span>;
            default: return <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-medium border border-gray-200">{severity}</span>;
        }
    };

    const getStatusIconAndColor = (status: string) => {
        switch (status) {
            case 'open': return { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-700', bg: 'bg-red-100/80', border: 'border-red-200' };
            case 'investigating': return { icon: <Clock className="w-4 h-4" />, color: 'text-amber-700', bg: 'bg-amber-100/80', border: 'border-amber-200' };
            case 'resolved': return { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' };
            case 'dismissed': return { icon: <XCircle className="w-4 h-4" />, color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-200' };
            default: return { icon: <Info className="w-4 h-4" />, color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' };
        }
    };

    if (reports.length === 0) {
        return (
            <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No damage reports</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">All equipment seems to be in good condition. No damage incidents have been reported.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Incident</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Asset</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Reported By</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800">
                        {reports.map((report, index) => {
                            const { icon, color, bg, border } = getStatusIconAndColor(report.status);
                            const isExpanded = expandedRow === report.id;
                            const isResolving = resolvingId === report.id;

                            // Mock a photo if DB array is empty for UI testing
                            const photos = report.photo_urls && report.photo_urls.length > 0
                                ? report.photo_urls
                                : ['https://images.unsplash.com/photo-1579208030886-b937da0925dc?q=80&w=400&fit=crop'];

                            const rowBg = isExpanded
                                ? 'bg-indigo-50/40 border-l-2 border-l-indigo-400'
                                : `border-l-2 border-l-transparent ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/30 dark:bg-gray-800/30'}`;

                            return (
                                <React.Fragment key={report.id}>
                                    <tr
                                        onClick={() => toggleRow(report.id)}
                                        className={`hover:bg-indigo-50/30 transition-colors cursor-pointer group ${rowBg}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${bg} ${color}`}>
                                                    {icon}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                        {new Date(report.created_at).toLocaleDateString()}
                                                        {getSeverityBadge(report.severity)}
                                                    </div>
                                                    <div className="text-gray-500 text-xs mt-0.5 w-[200px] truncate">
                                                        {report.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{report.assets?.name || 'Unknown'}</div>
                                            <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 font-mono">{report.assets?.qr_code}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900 dark:text-gray-100">{report.profiles?.full_name || 'System Generated'}</div>
                                            <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{report.profiles?.student_id || 'Admin'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize border ${bg} ${border} ${color}`}>
                                                    {icon} {report.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-gray-400 px-2 py-1 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-xs font-medium">
                                                {isExpanded ? 'Hide' : 'View'}
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Expandable Content Area */}
                                    {isExpanded && (
                                        <tr className="bg-gray-50/50 border-b border-gray-100 shadow-[inset_0_4px_6px_-6px_rgba(0,0,0,0.1)]">
                                            <td colSpan={5} className="p-0 border-l-2 border-l-red-400">
                                                <div className="p-6 md:p-8 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                                        {/* Details Column */}
                                                        <div className="space-y-6">
                                                            <div>
                                                                <h4 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">Report Description</h4>
                                                                <div className="bg-white border rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                                                                    {report.description}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <h4 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">Evidence Photos</h4>
                                                                <div className="flex gap-4">
                                                                    {photos.map((url, i) => (
                                                                        <div key={i} className="relative w-32 h-32 rounded-lg border overflow-hidden group bg-white">
                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                            <img src={url} alt={`Evidence ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                                                            <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                <ExternalLink className="w-5 h-5 text-white" />
                                                                            </a>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Resolution Column */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Resolution Management</h4>
                                                                {!isResolving && report.status !== 'resolved' && (
                                                                    <button
                                                                        onClick={() => setResolvingId(report.id)}
                                                                        className="text-xs bg-white border shadow-sm px-3 py-1.5 rounded-md font-medium text-indigo-600 hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        Update Status
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {isResolving ? (
                                                                <div className="bg-white border text-card-foreground shadow-sm rounded-lg p-4 space-y-4">
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Investigation Notes</label>
                                                                        <textarea
                                                                            value={notes}
                                                                            onChange={(e) => setNotes(e.target.value)}
                                                                            placeholder="Document your findings, repair costs, or actions taken..."
                                                                            className="w-full h-24 p-3 border rounded-md text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                                                                        <button
                                                                            onClick={() => handleSave(report.id, 'investigating')}
                                                                            className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-md text-sm font-medium transition-colors"
                                                                        >
                                                                            Mark Investigating
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleSave(report.id, 'resolved')}
                                                                            className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-md text-sm font-medium transition-colors"
                                                                        >
                                                                            Resolve Incident
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleSave(report.id, 'dismissed')}
                                                                            className="px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors"
                                                                        >
                                                                            Dismiss
                                                                        </button>
                                                                        <div className="flex-1"></div>
                                                                        <button
                                                                            onClick={() => setResolvingId(null)}
                                                                            className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-white border rounded-lg p-4 h-[calc(100%-28px)]">
                                                                    {report.resolution_notes ? (
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</span>
                                                                                <p className="mt-1 font-medium capitalize flex items-center gap-2">
                                                                                    {icon} {report.status}
                                                                                </p>
                                                                            </div>
                                                                            <div className="pt-4 border-t border-gray-100">
                                                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</span>
                                                                                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{report.resolution_notes}</p>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-8">
                                                                            <Info className="w-8 h-8 mb-2 opacity-20" />
                                                                            <p className="text-sm">No resolution notes yet.</p>
                                                                            <p className="text-xs mt-1">Click 'Update Status' to begin investigation.</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
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
