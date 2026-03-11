'use client';

import React, { useState } from 'react';
import type { DamageReportWithDetails } from '@/lib/bookingService';

interface DamageTableProps {
    reports: DamageReportWithDetails[];
    onUpdateStatus: (id: string, status: string, notes: string) => void;
}

/**
 * Table component for displaying and managing damage reports.
 * 用于展示和管理损坏报告的表格组件
 */
export default function DamageTable({ reports, onUpdateStatus }: DamageTableProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNotes, setEditNotes] = useState('');
    const [editStatus, setEditStatus] = useState('');

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Open</span>;
            case 'investigating':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Investigating</span>;
            case 'resolved':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Resolved</span>;
            case 'dismissed':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Dismissed</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'minor':
                return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700">Minor</span>;
            case 'moderate':
                return <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700">Moderate</span>;
            case 'severe':
                return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">Severe</span>;
            default:
                return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700">{severity}</span>;
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
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
                <p className="text-gray-500 text-lg font-medium">No damage reports found</p>
                <p className="text-gray-400 text-sm mt-1">All equipment is in good condition.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Asset</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Reporter</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Severity</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {reports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                {report.assets?.name || 'Unknown Asset'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {report.profiles?.full_name || 'Unknown'}
                                {report.profiles?.student_id && (
                                    <span className="block text-xs text-gray-400">{report.profiles.student_id}</span>
                                )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                {getSeverityBadge(report.severity)}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                                {report.description}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                {editingId === report.id ? (
                                    <select
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value)}
                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
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
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                {editingId === report.id ? (
                                    <div className="flex gap-2 justify-end">
                                        <input
                                            type="text"
                                            value={editNotes}
                                            onChange={(e) => setEditNotes(e.target.value)}
                                            placeholder="Resolution notes..."
                                            className="block w-40 rounded-md border-0 py-1 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                        />
                                        <button
                                            onClick={() => handleSave(report.id)}
                                            className="text-emerald-600 hover:text-emerald-900 font-medium"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleEdit(report)}
                                        className="text-indigo-600 hover:text-indigo-900"
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
    );
}
