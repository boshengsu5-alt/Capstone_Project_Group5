'use client';

import React, { useState } from 'react';
import { formatDate, formatDateTime, formatDateTimeRange, formatTime } from '@/lib/dateTime';
import { ChevronDown, ChevronRight, X, AlertTriangle } from 'lucide-react';
import type { DamageReportWithDetails } from '@/lib/bookingService';

interface DamageTableProps {
    reports: DamageReportWithDetails[];
    onUpdateStatus: (id: string, status: string, notes: string, severity: string) => void;
}

// ============================================================
// Compensation Helpers. 赔偿估算辅助函数
// ============================================================

/**
 * Calculate depreciation ratio based on years since purchase.
 * 根据购置年限计算折旧比例 (§5.2)
 */
function getDepreciationRatio(purchaseDate: string | null): number {
    if (!purchaseDate) return 0.5;
    const years = (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (years <= 1) return 1.0;
    if (years <= 3) return 0.8;
    if (years <= 5) return 0.5;
    return 0.2;
}

/** Damage coefficient by severity. 损坏系数 (§5.2) */
const DAMAGE_COEFFICIENT: Record<string, number> = { minor: 0.2, moderate: 0.5, severe: 1.0, lost: 1.0 };

/** Credit deduction by severity. 信用分扣减标准 (§5.3) */
const CREDIT_DEDUCTION: Record<string, number> = { minor: -5, moderate: -15, severe: -30, lost: -50 };

function getDepreciationLabel(purchaseDate: string | null): string {
    if (!purchaseDate) return '50% (unknown age)';
    const years = (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (years <= 1) return `100% (< 1y)`;
    if (years <= 3) return `80% (1-3y)`;
    if (years <= 5) return `50% (3-5y)`;
    return `20% (> 5y)`;
}

/**
 * Estimate compensation amount per §5.2 rules.
 * 估算赔偿金额，lost 场景区分全款和折旧价（§5.2）：
 *   - auto_generated=true 或管理员报告 → 全款（不折旧）
 *   - 用户主动自报（reporter_id==borrower_id）→ 折旧价
 */
function estimateCompensation(report: DamageReportWithDetails): number | null {
    if (report.status === 'dismissed') return 0;
    const price = report.assets?.purchase_price;
    if (price == null) return null;

    if (report.severity === 'lost') {
        const isUserSelfReport = !report.auto_generated
            && report.reporter_id === report.bookings?.borrower_id;
        if (isUserSelfReport) {
            // 用户主动申报：折旧价
            const depreciation = getDepreciationRatio(report.assets?.purchase_date ?? null);
            return Math.round(price * depreciation);
        }
        // 系统自动或管理员发现：全款
        return Math.round(price);
    }

    const depreciation = getDepreciationRatio(report.assets?.purchase_date ?? null);
    const coefficient = DAMAGE_COEFFICIENT[report.severity] ?? 0.5;
    return Math.round(price * depreciation * coefficient);
}

// ============================================================
// Badge Components. Badge 组件
// ============================================================

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        open: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
        investigating: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]',
        resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
        dismissed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] ?? styles.dismissed}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const styles: Record<string, string> = {
        minor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        moderate: 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_6px_rgba(249,115,22,0.15)]',
        severe: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
        lost: 'bg-rose-900/30 text-rose-300 border-rose-800/50 shadow-[0_0_8px_rgba(153,27,27,0.3)]',
    };
    const labels: Record<string, string> = { minor: 'Minor', moderate: 'Moderate', severe: 'Severe', lost: 'Lost' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles[severity] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
            {labels[severity] ?? severity.charAt(0).toUpperCase() + severity.slice(1)}
        </span>
    );
}

function ConditionBadge({ condition }: { condition: string }) {
    const styles: Record<string, { color: string; label: string }> = {
        new: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'New' },
        good: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Good' },
        fair: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Fair' },
        poor: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Poor' },
        damaged: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Damaged' },
    };
    const b = styles[condition] ?? { color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', label: condition };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${b.color}`}>
            {b.label}
        </span>
    );
}

// ============================================================
// Update Modal. 处理弹窗
// ============================================================

interface UpdateModalProps {
    report: DamageReportWithDetails;
    onSave: (id: string, status: string, notes: string, severity: string) => void;
    onClose: () => void;
}

type DamageStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

// 单向状态流转：每个状态只能前进到指定的下一步
const NEXT_STATES: Record<DamageStatus, { value: DamageStatus; label: string }[]> = {
    open:          [{ value: 'investigating', label: 'Begin Investigation' }, { value: 'dismissed', label: 'Dismiss (No Fault)' }],
    investigating: [{ value: 'resolved',      label: 'Mark Resolved'       }, { value: 'dismissed', label: 'Dismiss (No Fault)' }],
    resolved:      [],
    dismissed:     [],
};

function getNextStateOptions(status: DamageStatus, severity: string) {
    if (severity !== 'lost') return NEXT_STATES[status] ?? [];

    switch (status) {
        case 'open':
            return [
                { value: 'investigating' as const, label: 'Begin Lost Confirmation' },
                { value: 'dismissed' as const, label: 'Mark Found / Restore Return Flow' },
            ];
        case 'investigating':
            return [
                { value: 'resolved' as const, label: 'Confirm Final Loss' },
                { value: 'dismissed' as const, label: 'Mark Found / Restore Return Flow' },
            ];
        default:
            return [];
    }
}

function UpdateModal({ report, onSave, onClose }: UpdateModalProps) {
    const currentStatus = report.status as DamageStatus;
    const options = getNextStateOptions(currentStatus, report.severity);

    const [nextStatus, setNextStatus] = useState<DamageStatus>(options[0]?.value ?? 'investigating');
    // 管理员可以在处理时调整最终 severity（学生可能申报有误）
    const [severity, setSeverity] = useState<string>(report.severity);
    const [notes, setNotes] = useState(report.resolution_notes || '');
    // 选择 resolved 时需要二次确认
    const [confirming, setConfirming] = useState(false);

    const price = report.assets?.purchase_price;
    const depRatio = getDepreciationRatio(report.assets?.purchase_date ?? null);
    const depLabel = getDepreciationLabel(report.assets?.purchase_date ?? null);
    const borrowerName = report.bookings?.profiles?.full_name || report.profiles?.full_name || 'Unknown';
    const borrowerSid = report.bookings?.profiles?.student_id || report.profiles?.student_id || '';
    const isLostWorkflow = report.severity === 'lost';

    // 判断 lost 场景：用于弹窗内赔偿金和信用分的正确预览
    const isAutoGenerated = report.auto_generated ?? false;
    const isUserSelfReport = !isAutoGenerated && report.reporter_id === report.bookings?.borrower_id;

    /** 按 severity 和报告场景计算正确的赔偿预览 */
    function computeCompensation(sev: string): number | null {
        if (price == null) return null;
        if (sev === 'lost') {
            // 用户主动自报 → 折旧价；系统自动/管理员发现调包 → 全款
            return isUserSelfReport ? Math.round(price * depRatio) : Math.round(price);
        }
        return Math.round(price * depRatio * (DAMAGE_COEFFICIENT[sev] ?? 0.5));
    }

    const compensation = computeCompensation(severity);

    // 信用分预览：区分 lost 三场景
    const creditDelta = (() => {
        if (severity !== 'lost') return CREDIT_DEDUCTION[severity] ?? -5;
        if (isAutoGenerated) return 0;       // 逾期系统已扣满，不重复
        if (isUserSelfReport) return -30;    // 用户主动申报，从轻
        return -50;                          // 管理员发现调包，重罚
    })();

    const handleAction = () => {
        if (nextStatus === 'resolved' && !confirming) {
            setConfirming(true);
            return;
        }
        onSave(report.id, nextStatus, notes, severity);
    };

    const isResolvePath = nextStatus === 'resolved';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#111111] shadow-2xl shadow-black/60 overflow-y-auto max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                            <AlertTriangle className="h-5 w-5 text-rose-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {currentStatus === 'open'
                                    ? (isLostWorkflow ? 'Review Lost Report' : 'Review Report')
                                    : (isLostWorkflow ? 'Resolve Lost Report' : 'Resolve Case')}
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">{report.assets?.name ?? 'Unknown Asset'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* 借用人信息 */}
                <div className="mx-6 mb-4 rounded-xl border border-white/5 bg-white/5 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Borrower (liable)</span>
                    <span className="text-sm text-white font-medium">
                        {borrowerName}
                        {borrowerSid && <span className="text-gray-500 font-mono text-xs ml-1.5">({borrowerSid})</span>}
                    </span>
                </div>

                {isLostWorkflow && currentStatus !== 'resolved' && currentStatus !== 'dismissed' && (
                    <div className="mx-6 mb-4 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 space-y-1.5">
                        <p className="text-xs font-semibold text-orange-300 uppercase tracking-wider">Lost Workflow</p>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            The student has reported this device as lost. The booking is currently frozen in a reversible
                            <span className="text-orange-300 font-semibold"> lost pending confirmation</span> state, so the normal return flow is paused.
                        </p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Choose <span className="text-emerald-300 font-medium">Mark Found / Restore Return Flow</span> if the device has been found.
                            Choose <span className="text-rose-300 font-medium">Confirm Final Loss</span> only when the loss is confirmed and the asset should be retired.
                        </p>
                    </div>
                )}

                {/* Severity 调整（仅在标记为 Resolved 时显示） */}
                {isResolvePath && (
                    <>
                        <div className="mx-6 mb-4">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Final Severity — admin may adjust
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['minor', 'moderate', 'severe', 'lost'] as const).map((s) => {
                                    const comp = computeCompensation(s);
                                    const active = severity === s;
                                    const colors = {
                                        minor:    active ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300' : 'border-white/10 text-gray-400 hover:border-yellow-500/40',
                                        moderate: active ? 'border-orange-500 bg-orange-500/10 text-orange-300' : 'border-white/10 text-gray-400 hover:border-orange-500/40',
                                        severe:   active ? 'border-red-500    bg-red-500/10    text-red-300'    : 'border-white/10 text-gray-400 hover:border-red-500/40',
                                        lost:     active ? 'border-rose-800   bg-rose-900/30   text-rose-300'   : 'border-white/10 text-gray-400 hover:border-rose-800/40',
                                    };
                                    const labels = { minor: 'Minor', moderate: 'Moderate', severe: 'Severe', lost: '❌ Lost' };
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => { setSeverity(s); setConfirming(false); }}
                                            className={`rounded-xl border px-3 py-2.5 text-center text-xs font-semibold transition-all ${colors[s]}`}
                                        >
                                            <div className="mb-1">{labels[s]}</div>
                                            <div className="text-[10px] opacity-70">
                                                {comp != null ? `¥${comp.toLocaleString()}` : '—'} · {s === 'lost'
                                                    ? (isAutoGenerated ? 0 : isUserSelfReport ? 30 : 50)
                                                    : Math.abs(CREDIT_DEDUCTION[s] ?? 5)
                                                }pt
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 赔偿公式（仅在标记为 Resolved 时显示） */}
                        {price != null && (
                            <div className="mx-6 mb-4 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3 space-y-1">
                                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">Compensation Estimate</p>
                                {severity === 'lost' ? (
                                    isUserSelfReport ? (
                                        <p className="text-xs text-gray-400">
                                            ¥{price.toLocaleString()} <span className="text-gray-600">（购入价）</span>
                                            × {depLabel} <span className="text-gray-600">（折旧率，用户主动申报）</span>
                                        </p>
                                    ) : isAutoGenerated ? (
                                        <p className="text-xs text-gray-400">
                                            ¥{price.toLocaleString()} <span className="text-gray-600">（全款，系统自动判定丢失，不计折旧）</span>
                                        </p>
                                    ) : (
                                        <p className="text-xs text-gray-400">
                                            ¥{price.toLocaleString()} <span className="text-gray-600">（全款，管理员发现调包，不计折旧）</span>
                                        </p>
                                    )
                                ) : (
                                    <p className="text-xs text-gray-400">
                                        ¥{price.toLocaleString()} <span className="text-gray-600">（购入价）</span>
                                        × {depLabel} <span className="text-gray-600">（折旧率）</span>
                                        × {DAMAGE_COEFFICIENT[severity] ?? 0.5} <span className="text-gray-600">（{severity} 系数）</span>
                                    </p>
                                )}
                                <p className="text-sm font-bold text-amber-400">
                                    = ¥{compensation?.toLocaleString() ?? '—'}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* 下一步状态选择 */}
                <div className="mx-6 mb-4">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Next Step</label>
                    <div className="flex gap-2">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { setNextStatus(opt.value); setConfirming(false); }}
                                className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                                    nextStatus === opt.value
                                        ? opt.value === 'dismissed'
                                            ? 'border-gray-500 bg-gray-500/10 text-gray-200'
                                            : opt.value === 'resolved'
                                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                                : 'border-purple-500 bg-purple-500/10 text-purple-300'
                                        : 'border-white/10 text-gray-500 hover:border-white/20'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {nextStatus === 'dismissed' && (
                        <p className="mt-2 text-xs text-emerald-400">
                            {isLostWorkflow
                                ? 'Marking this lost report as found will restore the normal return / damage flow.'
                                : 'No fault determined — no credit deduction.'}
                        </p>
                    )}
                </div>

                {/* Notes */}
                <div className="mx-6 mb-4">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Describe findings or resolution details..."
                        className="block w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-sm text-gray-200 placeholder:text-gray-600 focus:ring-2 focus:ring-purple-500/50 outline-none resize-none"
                    />
                </div>

                {/* 二次确认区块（仅 resolved 时显示） */}
                {confirming && isResolvePath && (
                    <div className="mx-6 mb-4 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 space-y-1">
                        <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> This action cannot be undone
                        </p>
                        <p className="text-xs text-gray-400">
                            Borrower <span className="text-white font-medium">{borrowerName}</span> will receive:
                        </p>
                        <ul className="text-xs text-gray-300 space-y-0.5 ml-2">
                            <li>• Credit deduction: <span className="text-rose-400 font-semibold">−{Math.abs(creditDelta)} points</span></li>
                            {compensation != null && (
                                <li>• Compensation record: <span className="text-amber-400 font-semibold">¥{compensation.toLocaleString()}</span></li>
                            )}
                            {severity === 'lost' && (
                                <>
                                    <li>• Booking final state: <span className="text-rose-300 font-semibold">lost</span></li>
                                    <li>• Asset circulation state: <span className="text-rose-300 font-semibold">retired</span></li>
                                </>
                            )}
                        </ul>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 px-6 pb-6">
                    <button
                        onClick={confirming ? () => setConfirming(false) : onClose}
                        className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 hover:bg-white/5 transition-colors"
                    >
                        {confirming ? 'Back' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleAction}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${
                            isResolvePath && confirming
                                ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.3)]'
                                : 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_12px_rgba(147,51,234,0.3)]'
                        }`}
                    >
                        {isResolvePath && !confirming
                            ? (severity === 'lost' ? 'Review Final Loss →' : 'Review & Confirm →')
                            : isResolvePath
                                ? 'Confirm & Execute'
                                : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Expanded Row Detail. 展开行详情
// ============================================================

function ExpandedDetail({ report }: { report: DamageReportWithDetails }) {
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const compensation = estimateCompensation(report);

    const pickupPhoto = report.bookings?.pickup_photo_url || null;
    const returnPhoto = report.bookings?.return_photo_url || null;
    const hasBookingPhotos = pickupPhoto || returnPhoto;
    const bookingPeriod = formatDateTimeRange(report.bookings?.start_date ?? null, report.bookings?.end_date ?? null);

    return (
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 space-y-4">
            {report.severity === 'lost' && (
                <div className={`rounded-xl border px-4 py-3 ${
                    report.status === 'resolved'
                        ? 'border-rose-500/20 bg-rose-500/5'
                        : report.status === 'dismissed'
                            ? 'border-emerald-500/20 bg-emerald-500/5'
                            : 'border-orange-500/20 bg-orange-500/5'
                }`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                        report.status === 'resolved'
                            ? 'text-rose-300'
                            : report.status === 'dismissed'
                                ? 'text-emerald-300'
                                : 'text-orange-300'
                    }`}>
                        {report.status === 'resolved'
                            ? 'Final Lost State'
                            : report.status === 'dismissed'
                                ? 'Lost Report Reversed'
                                : 'Lost Pending Confirmation'}
                    </p>
                    <p className="text-xs text-gray-300 leading-relaxed">
                        {report.status === 'resolved'
                            ? 'This report has been confirmed as a real loss. The linked booking should now be closed as lost and the asset should be retired from circulation.'
                            : report.status === 'dismissed'
                                ? 'This lost report was cancelled or the device was found. The linked booking can return to the normal borrowing / return flow.'
                                : 'The device is temporarily treated as reported lost. Before final confirmation, the student may still find the device and edit the report back into the normal return flow.'}
                    </p>
                </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Booking Period</h4>
                    <p className="text-sm text-gray-200 leading-relaxed">{bookingPeriod}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Reported At</h4>
                    <p className="text-sm text-gray-200">{formatDateTime(report.created_at)}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Actual Return</h4>
                    <p className="text-sm text-gray-200">{formatDateTime(report.bookings?.actual_return_date ?? null)}</p>
                </div>
            </div>

            {/* 取货 / 归还照片对比（来自借用记录） */}
            {hasBookingPhotos && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Booking Photos — Pickup vs Return</h4>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                        <div>
                            <p className="text-xs text-blue-400 mb-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                                Pickup / Original
                            </p>
                            {pickupPhoto ? (
                                <img
                                    src={pickupPhoto}
                                    alt="Pickup condition"
                                    onClick={() => setLightboxUrl(pickupPhoto)}
                                    className="w-full aspect-[4/3] object-cover rounded-lg border border-white/10 cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all"
                                />
                            ) : (
                                <div className="w-full aspect-[4/3] rounded-lg border border-dashed border-white/10 flex items-center justify-center">
                                    <span className="text-xs text-gray-600">No pickup photo</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-amber-400 mb-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                                Return Photo
                            </p>
                            {returnPhoto ? (
                                <img
                                    src={returnPhoto}
                                    alt="Return condition"
                                    onClick={() => setLightboxUrl(returnPhoto)}
                                    className="w-full aspect-[4/3] object-cover rounded-lg border border-white/10 cursor-pointer hover:ring-2 hover:ring-amber-500/50 transition-all"
                                />
                            ) : (
                                <div className="w-full aspect-[4/3] rounded-lg border border-dashed border-white/10 flex items-center justify-center">
                                    <span className="text-xs text-gray-600">No return photo</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 损坏照片（学生额外上传的证据） */}
            {report.photo_urls && report.photo_urls.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Damage Photos</h4>
                    <div className="flex gap-3 flex-wrap">
                        {report.photo_urls.map((url, i) => (
                            <img
                                key={i}
                                src={url}
                                alt={`Damage photo ${i + 1}`}
                                onClick={() => setLightboxUrl(url)}
                                className="w-24 h-24 object-cover rounded-lg border border-white/10 cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 完整描述 */}
            <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Full Description</h4>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{report.description || '—'}</p>
            </div>

            {/* 赔偿估算 */}
            {report.assets?.purchase_price != null && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Compensation Estimate</h4>
                    <p className="text-sm text-gray-300">
                        {(() => {
                            const p = report.assets!.purchase_price!;
                            const depLabel = getDepreciationLabel(report.assets!.purchase_date ?? null);
                            if (report.severity === 'lost') {
                                const selfReport = !report.auto_generated && report.reporter_id === report.bookings?.borrower_id;
                                return selfReport
                                    ? `¥${p.toLocaleString()} × ${depLabel}（折旧，用户自报）`
                                    : `¥${p.toLocaleString()}（全款，不计折旧）`;
                            }
                            return `¥${p.toLocaleString()} × ${depLabel} × ${DAMAGE_COEFFICIENT[report.severity] ?? 0.5} (${report.severity})`;
                        })()}
                        {compensation !== null && (
                            <span className="ml-2 text-amber-400 font-semibold">= ¥{compensation.toLocaleString()}</span>
                        )}
                    </p>
                </div>
            )}

            {/* 处理备注 */}
            {report.resolution_notes && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Resolution Notes</h4>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{report.resolution_notes}</p>
                </div>
            )}

            {/* Lightbox 全屏预览 */}
            {lightboxUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
                    <img src={lightboxUrl} alt="Damage photo full" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" />
                </div>
            )}
        </div>
    );
}

// ============================================================
// Main Table. 主表格
// ============================================================

/**
 * Dark-themed table for displaying and managing damage reports.
 * 损坏报告管理表格，支持行展开和弹窗处理
 */
export default function DamageTable({ reports, onUpdateStatus }: DamageTableProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [modalReport, setModalReport] = useState<DamageReportWithDetails | null>(null);

    const handleSave = (id: string, status: string, notes: string, severity: string) => {
        onUpdateStatus(id, status, notes, severity);
        setModalReport(null);
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
        <>
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/40 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="w-8 py-4 pl-4" />
                                <th className="py-4 pr-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Asset</th>
                                <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Borrower</th>
                                <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Severity</th>
                                <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Condition</th>
                                <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Est. Comp.</th>
                                <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="relative py-4 pl-3 pr-6">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {reports.map((report) => {
                                const isExpanded = expandedId === report.id;
                                const compensation = estimateCompensation(report);

                                return (
                                    <React.Fragment key={report.id}>
                                        <tr
                                            className="hover:bg-white/5 transition-colors cursor-pointer group"
                                            onClick={() => setExpandedId(isExpanded ? null : report.id)}
                                        >
                                            <td className="py-4 pl-4 text-gray-500">
                                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </td>
                                            <td className="py-4 pr-3">
                                                <div className="flex items-center gap-3">
                                                    {report.assets?.images?.[0] ? (
                                                        <img
                                                            src={report.assets.images[0]}
                                                            alt=""
                                                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex-shrink-0 border border-white/10" />
                                                    )}
                                                    <span className="text-sm font-medium text-white whitespace-nowrap">
                                                        {report.assets?.name || 'Unknown Asset'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                                {report.bookings?.profiles?.full_name || report.profiles?.full_name || 'Unknown'}
                                                {(report.bookings?.profiles?.student_id || report.profiles?.student_id) && (
                                                    <span className="block text-xs text-gray-500 font-mono mt-0.5">
                                                        {report.bookings?.profiles?.student_id || report.profiles?.student_id}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                <SeverityBadge severity={report.severity} />
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                <ConditionBadge condition={report.assets?.condition ?? 'unknown'} />
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-amber-400 font-medium">
                                                {compensation !== null ? `¥${compensation.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                <StatusBadge status={report.status} />
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <div className="text-sm text-gray-200">{formatDate(report.created_at)}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">{formatTime(report.created_at)}</div>
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                                                {report.status !== 'resolved' && report.status !== 'dismissed' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setModalReport(report);
                                                        }}
                                                        className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                                                    >
                                                        Update
                                                    </button>
                                                )}
                                            </td>
                                        </tr>

                                        {/* 展开详情行 */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={9} className="p-0">
                                                    <ExpandedDetail report={report} />
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

            {/* Update 弹窗 */}
            {modalReport && (
                <UpdateModal
                    report={modalReport}
                    onSave={handleSave}
                    onClose={() => setModalReport(null)}
                />
            )}
        </>
    );
}
