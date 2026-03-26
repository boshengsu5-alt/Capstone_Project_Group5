'use client';

import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import type { BookingWithDetails } from '@/lib/bookingService';

interface DamageSeverityModalProps {
    isOpen: boolean;
    booking: BookingWithDetails | null;
    onSelect: (severity: 'minor' | 'moderate' | 'severe', description: string) => void;
    onClose: () => void;
}

const SEVERITY_OPTIONS = [
    {
        value: 'minor' as const,
        label: 'Minor Wear',
        labelCn: '轻微磨损',
        points: -10,
        color: 'text-yellow-400',
        border: 'border-yellow-500/30',
        bg: 'bg-yellow-500/5 hover:bg-yellow-500/15',
        badgeBg: 'bg-yellow-500/10 text-yellow-400',
    },
    {
        value: 'moderate' as const,
        label: 'Moderate Damage',
        labelCn: '中度损坏',
        points: -20,
        color: 'text-orange-400',
        border: 'border-orange-500/30',
        bg: 'bg-orange-500/5 hover:bg-orange-500/15',
        badgeBg: 'bg-orange-500/10 text-orange-400',
    },
    {
        value: 'severe' as const,
        label: 'Severe Damage',
        labelCn: '严重损坏',
        points: -30,
        color: 'text-red-400',
        border: 'border-red-500/30',
        bg: 'bg-red-500/5 hover:bg-red-500/15',
        badgeBg: 'bg-red-500/10 text-red-400',
    },
];

/**
 * Modal for admin to select damage severity and immediately deduct credit points.
 * 管理员选择损坏程度并立即扣减信用分的弹窗。
 */
export default function DamageSeverityModal({ isOpen, booking, onSelect, onClose }: DamageSeverityModalProps) {
    const [description, setDescription] = useState('');
    const [showError, setShowError] = useState(false);

    if (!isOpen || !booking) return null;

    const handleSelect = (severity: 'minor' | 'moderate' | 'severe') => {
        // 描述为必填项
        if (!description.trim()) {
            setShowError(true);
            return;
        }
        onSelect(severity, description.trim());
        setDescription('');
        setShowError(false);
    };

    const handleClose = () => {
        setDescription('');
        setShowError(false);
        onClose();
    };

    return (
        // 遮罩层
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* 弹窗主体 */}
            <div
                className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#111111] shadow-2xl shadow-black/60"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between p-6 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                            <ShieldAlert className="h-5 w-5 text-rose-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Select Damage Severity</h2>
                            <p className="text-xs text-gray-500 mt-0.5">选择损坏程度，信用分将在审核后扣减。</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* 借用信息 */}
                <div className="mx-6 mb-4 rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                    <p className="text-xs text-gray-500 mb-1">Reporting damage for</p>
                    <p className="text-sm font-semibold text-white">{booking.assets?.name ?? 'Unknown Asset'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Borrower: {booking.profiles?.full_name ?? 'Unknown'}
                        {booking.profiles?.student_id && (
                            <span className="ml-1.5 font-mono text-gray-500">({booking.profiles.student_id})</span>
                        )}
                    </p>
                </div>

                {/* 备注输入（必填） */}
                <div className="mx-6 mb-4">
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => { setDescription(e.target.value); if (e.target.value.trim()) setShowError(false); }}
                        placeholder="Required: describe the damage... 必填：描述损坏情况"
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 transition-colors bg-white/5
                            ${showError ? 'border-red-500/60 focus:ring-red-500/30' : 'border-white/10 focus:border-white/20 focus:ring-white/10'}`}
                    />
                    {showError && (
                        <p className="mt-1.5 text-xs text-red-400">Please describe the damage before selecting severity. 请先填写损坏描述。</p>
                    )}
                </div>

                {/* 程度选项 */}
                <div className="mx-6 mb-4 space-y-2.5">
                    {SEVERITY_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            className={`w-full flex items-center justify-between rounded-xl border px-4 py-3.5 transition-all ${opt.border} ${opt.bg}`}
                        >
                            <div className="text-left">
                                <span className={`text-sm font-semibold ${opt.color}`}>
                                    {opt.label} <span className="font-normal text-gray-400">({opt.labelCn})</span>
                                </span>
                            </div>
                            <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${opt.badgeBg}`}>
                                {opt.points} pts
                            </span>
                        </button>
                    ))}
                </div>

                {/* 取消 */}
                <div className="px-6 pb-6">
                    <button
                        onClick={handleClose}
                        className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
