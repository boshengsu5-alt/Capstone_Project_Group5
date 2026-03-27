'use client';

import React, { useState } from 'react';
import { BookingWithDetails, calcOverduePenalty } from '@/lib/bookingService';
import { formatDateTime, formatDateTimeRange } from '@/lib/dateTime';
import {
    X, Calendar, Clock, User, QrCode, ImageIcon,
    AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert,
} from 'lucide-react';

interface ApprovalModalProps {
    isOpen: boolean;
    booking: BookingWithDetails | null;
    onClose: () => void;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string, reason: string) => Promise<void>;
}

// ── Status badge config ──────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    pending:   { label: '待审批',  cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    approved:  { label: '已批准',  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    active:    { label: '借用中',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    returned:  { label: '已归还',  cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    overdue:   { label: '已逾期',  cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
    rejected:  { label: '已拒绝',  cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    cancelled: { label: '已取消',  cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    suspended: { label: '已暂停',  cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

function daysBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ApprovalModal({ isOpen, booking, onClose, onApprove, onReject }: ApprovalModalProps) {
    const [rejectionReason, setRejectionReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showRejectInput, setShowRejectInput] = useState(false);

    if (!isOpen || !booking) return null;

    const isReadOnly = booking.status !== 'pending';
    const statusCfg = STATUS_CFG[booking.status] ?? { label: booking.status, cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };

    // Overdue calc
    const overdueDays = booking.actual_return_date && booking.end_date
        ? Math.max(0, daysBetween(booking.end_date, booking.actual_return_date))
        : null;
    const overduePenalty = overdueDays ? calcOverduePenalty(overdueDays) : 0;

    // Borrow duration
    const borrowDays = daysBetween(booking.start_date, booking.end_date);

    // Photos
    const pickupPhoto = booking.pickup_photo_url || null;
    const returnPhoto = booking.return_photo_url || null;
    const hasPhotos = !!(pickupPhoto || returnPhoto);

    // Damage reports
    const pendingDamage = booking.damage_reports?.find(r => r.status === 'open' || r.status === 'investigating');

    const handleApprove = async () => {
        setIsLoading(true);
        try { await onApprove(booking.id); resetAndClose(); }
        catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) return;
        setIsLoading(true);
        try { await onReject(booking.id, rejectionReason); resetAndClose(); }
        catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const resetAndClose = () => {
        setShowRejectInput(false);
        setRejectionReason('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={resetAndClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-[#111111] shadow-2xl shadow-black/60 overflow-y-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="flex items-start gap-4 p-5 border-b border-white/5">
                    {/* Asset thumbnail */}
                    {booking.assets?.images?.[0] ? (
                        <img
                            src={booking.assets.images[0]}
                            alt=""
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-white/10"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-6 h-6 text-gray-600" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h2 className="text-lg font-bold text-white leading-tight">
                                    {booking.assets?.name ?? 'Unknown Asset'}
                                </h2>
                                {booking.assets?.qr_code && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <QrCode className="w-3 h-3 text-gray-500" />
                                        <span className="text-xs font-mono text-gray-500">{booking.assets.qr_code}</span>
                                    </div>
                                )}
                            </div>
                            <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.cls}`}>
                                {statusCfg.label}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {isReadOnly ? 'Booking Details' : 'Review Booking Request'}
                            <span className="ml-2 font-mono opacity-60">{booking.id.slice(0, 8)}…</span>
                        </p>
                    </div>
                    <button onClick={resetAndClose} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Info Grid ── */}
                <div className="p-5 space-y-3">

                    {/* Borrower */}
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                        <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-0.5">借用人</p>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white">{booking.profiles?.full_name ?? 'Unknown'}</span>
                                {booking.profiles?.student_id && (
                                    <span className="text-xs font-mono text-gray-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                                        {booking.profiles.student_id}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Booking period */}
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                        <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">借用周期</p>
                            <p className="text-sm font-semibold text-white">
                                {formatDateTimeRange(booking.start_date, booking.end_date)}
                                <span className="ml-2 text-xs text-gray-500 font-normal">（{borrowDays} 天）</span>
                            </p>
                        </div>
                    </div>

                    {/* Submitted time */}
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                        <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">提交时间</p>
                            <p className="text-sm text-gray-300">{formatDateTime(booking.created_at)}</p>
                        </div>
                    </div>

                    {/* Actual return + overdue (if returned/overdue) */}
                    {booking.actual_return_date && (
                        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                            <RotateCcw className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-0.5">实际归还日期</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm text-gray-300">{formatDateTime(booking.actual_return_date)}</span>
                                    {overdueDays != null && overdueDays > 0 ? (
                                        <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                            逾期 {overdueDays} 天 · 扣 {overduePenalty} 分
                                        </span>
                                    ) : (
                                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                            按时归还
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {booking.notes && (
                        <div className="bg-white/5 rounded-xl px-4 py-3">
                            <p className="text-xs text-gray-500 mb-1">备注 / Notes</p>
                            <p className="text-sm text-gray-300 leading-relaxed">{booking.notes}</p>
                        </div>
                    )}

                    {/* Rejection / suspension reason */}
                    {booking.rejection_reason && !['VERIFIED', 'ASSET_MAINTENANCE', 'ASSET_MAINTENANCE_EXPIRED', 'EXPIRED_PENDING'].includes(booking.rejection_reason) && (
                        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                            <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider mb-1">拒绝原因</p>
                            <p className="text-sm text-gray-300">{booking.rejection_reason}</p>
                        </div>
                    )}
                    {booking.rejection_reason === 'ASSET_MAINTENANCE' && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-amber-300">该预约因设备进入维护状态已被暂停，管理员重新上架后将自动恢复或取消。</p>
                        </div>
                    )}

                    {/* Damage report warning */}
                    {pendingDamage && (
                        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-rose-300">该借用存在未处理的损坏报告，请前往「损坏报告」页面处理。</p>
                        </div>
                    )}

                    {/* Photos — pickup + return side by side */}
                    {hasPhotos && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">取货 / 归还照片</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-blue-400 mb-1 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" /> 取货状态
                                    </p>
                                    {pickupPhoto ? (
                                        <img src={pickupPhoto} alt="pickup" className="w-full aspect-[4/3] object-cover rounded-xl border border-white/10" />
                                    ) : (
                                        <div className="w-full aspect-[4/3] rounded-xl border border-dashed border-white/10 flex items-center justify-center">
                                            <span className="text-xs text-gray-600">未拍照</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs text-amber-400 mb-1 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> 归还状态
                                    </p>
                                    {returnPhoto ? (
                                        <img src={returnPhoto} alt="return" className="w-full aspect-[4/3] object-cover rounded-xl border border-white/10" />
                                    ) : (
                                        <div className="w-full aspect-[4/3] rounded-xl border border-dashed border-white/10 flex items-center justify-center">
                                            <span className="text-xs text-gray-600">未拍照</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rejection reason input (inline, pending only) */}
                    {!isReadOnly && showRejectInput && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                拒绝原因 <span className="text-rose-400">*</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                rows={3}
                                placeholder="请简述拒绝该申请的原因..."
                                className="block w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-sm text-gray-200 placeholder:text-gray-600 focus:ring-2 focus:ring-rose-500/50 outline-none resize-none"
                                disabled={isLoading}
                            />
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex gap-3 px-5 pb-5">
                    {isReadOnly ? (
                        <button
                            onClick={resetAndClose}
                            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 hover:bg-white/5 transition-colors"
                        >
                            关闭
                        </button>
                    ) : showRejectInput ? (
                        <>
                            <button
                                onClick={() => setShowRejectInput(false)}
                                disabled={isLoading}
                                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 hover:bg-white/5 transition-colors"
                            >
                                返回
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isLoading || !rejectionReason.trim()}
                                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 shadow-[0_0_12px_rgba(225,29,72,0.3)]"
                            >
                                {isLoading ? '处理中...' : '确认拒绝'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowRejectInput(true)}
                                disabled={isLoading}
                                className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors"
                            >
                                拒绝申请
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isLoading}
                                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50
                                           bg-gradient-to-r from-emerald-600 to-teal-600
                                           hover:from-emerald-500 hover:to-teal-500
                                           shadow-[0_0_14px_rgba(16,185,129,0.3)]"
                            >
                                {isLoading ? '处理中...' : '批准申请'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
