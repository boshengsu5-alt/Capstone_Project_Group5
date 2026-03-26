'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X } from 'lucide-react';
import type { DamageReportWithDetails } from '@/lib/bookingService';

interface DamageUpdateModalProps {
    isOpen: boolean;
    report: DamageReportWithDetails | null;
    onSave: (id: string, status: string, notes: string) => void;
    onClose: () => void;
}

/**
 * Modal for admin to update damage report status and resolution notes.
 * 管理员更新损坏报告状态和处理备注的弹窗。
 */
export default function DamageUpdateModal({ isOpen, report, onSave, onClose }: DamageUpdateModalProps) {
    const [status, setStatus] = useState('');
    const [notes, setNotes] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (report && isOpen) {
            setStatus(report.status);
            setNotes(report.resolution_notes || '');
        }
    }, [report, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen || !report || !mounted) return null;

    const handleSave = () => {
        onSave(report.id, status, notes);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div
                className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#111111] shadow-2xl shadow-black/60 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Update Report Status</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Update resolution progress and notes.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Item Info */}
                    <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                        <p className="text-xs text-gray-500 mb-1">Asset Information</p>
                        <p className="text-sm font-semibold text-white">{report.assets?.name ?? 'Unknown Asset'}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Reported by: {report.profiles?.full_name ?? 'Unknown'}
                        </p>
                    </div>

                    {/* Status Select */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Resolution Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer hover:border-white/20"
                        >
                            <option value="open">Open</option>
                            <option value="investigating">Investigating</option>
                            <option value="resolved">Resolved</option>
                            <option value="dismissed">Dismissed</option>
                        </select>
                    </div>

                    {/* Resolution Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Resolution Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Enter details about the resolution or next steps..."
                            rows={4}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none hover:border-white/20"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 p-6 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-bold text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/20"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
