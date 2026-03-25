'use client';

import React, { useState } from 'react';
import type { DamageReportWithDetails } from '@/lib/bookingService';

interface DamageTableProps {
    reports: DamageReportWithDetails[];
    onUpdateStatus: (id: string, status: string, notes: string) => void;
}

/**
 * Dark-themed table for displaying and managing damage reports.
 */
export default function DamageTable({ reports, onUpdateStatus }: DamageTableProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNotes, setEditNotes] = useState('');
    const [editStatus, setEditStatus] = useState('');

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.15)]">
                        Open
                    </span>
                );
            case 'investigating':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                        Investigating
                    </span>
                );
            case 'resolved':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                        Resolved
                    </span>
                );
            case 'dismissed':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-500/10 text-gray-400 border-gray-500/20">
                        Dismissed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-500/10 text-gray-400 border-gray-500/20">
                        {status}
                    </span>
                );
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'minor':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        Minor
                    </span>
                );
            case 'moderate':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_6px_rgba(249,115,22,0.15)]">
                        Moderate
                    </span>
                );
            case 'severe':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                        Severe
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        {severity}
                    </span>
                );
        }
    };

    const handleEdit = (report: DamageReportWithDetails) => {
        setEditingId(report.id);
        setEditStatus(report.status);
        setEditNotes(report.resolution_notes || '');
    };

    const handleSave = (id: string) => {
        onUpdateStatus(id, editStatus, editNotes);
        setEditingId(null);
    };

    if (reports.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-900/40 rounded-2xl border border-white/5 backdrop-blur-sm">
                <p className="text-gray-300 text-lg font-medium">No damage reports found</p>
                <p className="text-gray-500 text-sm mt-1">All equipment is in good condition.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/40 backdrop-blur-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="py-4 pl-6 pr-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Asset</th>
                            <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Reporter</th>
                            <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Severity</th>
                            <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Description</th>
                            <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                            <th className="relative py-4 pl-3 pr-6">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {reports.map((report) => (
                            <tr key={report.id} className="hover:bg-white/5 transition-colors group">
                                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-white">
                                    {report.assets?.name || 'Unknown Asset'}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                    {report.profiles?.full_name || 'Unknown'}
                                    {report.profiles?.student_id && (
                                        <span className="block text-xs text-gray-500 font-mono mt-0.5">{report.profiles.student_id}</span>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    {getSeverityBadge(report.severity)}
                                </td>
                                <td className="px-3 py-4 text-sm text-gray-400 max-w-xs truncate">
                                    {report.description}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    {editingId === report.id ? (
                                        <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value)}
                                            className="block w-full rounded-lg border border-white/10 bg-gray-800 py-1.5 text-sm text-gray-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none"
                                        >
                                            <option value="open">Open</option>
                                            <option value="investigating">Investigating</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="dismissed">Dismissed</option>
                                        </select>
                                    ) : (
                                        getStatusBadge(report.status)
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {new Date(report.created_at).toLocaleDateString()}
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                                    {editingId === report.id ? (
                                        <div className="flex gap-2 justify-end items-center">
                                            <input
                                                type="text"
                                                value={editNotes}
                                                onChange={(e) => setEditNotes(e.target.value)}
                                                placeholder="Resolution notes..."
                                                className="block w-40 rounded-lg border border-white/10 bg-gray-800 py-1 px-2 text-sm text-gray-200 placeholder:text-gray-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none"
                                            />
                                            <button
                                                onClick={() => handleSave(report.id)}
                                                className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleEdit(report)}
                                            className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                                        >
                                            Update
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
