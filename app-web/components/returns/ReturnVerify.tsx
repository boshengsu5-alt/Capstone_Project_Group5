'use client';

import React from 'react';
import { CheckCircle, AlertTriangle, ImageIcon, Calendar, Clock, ExternalLink } from 'lucide-react';
import { calcOverduePenalty } from '@/lib/bookingService';
import { formatDateTime, formatDateTimeRange } from '@/lib/dateTime';
import type { BookingWithDetails } from '@/lib/bookingService';

interface ReturnVerifyProps {
    booking: BookingWithDetails;
    onVerify: (id: string, isDamaged: boolean) => void;
    /** 学生已提交损坏报告时触发，管理员仅需确认归还 */
    onAcknowledgeWithDamage?: (id: string) => void;
}

/**
 * Calculate difference in days between two date strings.
 * 计算两个日期字符串之间的天数差
 */
function differenceInDays(dateA: string, dateB: string): number {
    const a = new Date(dateA);
    const b = new Date(dateB);
    return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Side-by-side photo comparison for return verification with date info.
 * 归还验证照片对比组件，含借用期和逾期信息
 */
export default function ReturnVerify({ booking, onVerify, onAcknowledgeWithDamage }: ReturnVerifyProps) {
    const pickupPhoto = booking.pickup_photo_url || null;
    const returnPhoto = booking.return_photo_url || null;

    // 日期计算
    const startDate = booking.start_date;
    const endDate = booking.end_date;
    const actualReturnDate = booking.actual_return_date;
    const borrowDays = startDate && endDate ? differenceInDays(endDate, startDate) : null;

    // 逾期判断：actual_return_date > end_date
    let overdueDays: number | null = null;
    let isOverdue = false;
    if (actualReturnDate && endDate) {
        overdueDays = differenceInDays(actualReturnDate, endDate);
        isOverdue = overdueDays > 0;
    }

    // 只要学生已经提交过损坏报告，就不再允许管理员重复创建第二条
    const existingDamageReport = booking.damage_reports?.[0] ?? null;

    const PhotoPlaceholder = ({ label }: { label: string }) => (
        <div className="w-full aspect-[4/3] bg-white/5 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-white/10">
            <ImageIcon className="w-12 h-12 text-gray-600 mb-2" />
            <span className="text-sm text-gray-500 font-medium">{label}</span>
        </div>
    );

    return (
        <div className="bg-gray-900/40 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm">
            {/* Info bar */}
            <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-white">
                            {booking.assets?.name ?? 'Unknown Asset'}
                        </h3>
                        <p className="text-sm text-gray-400 mt-0.5">
                            Returned by{' '}
                            <span className="font-medium text-gray-200">{booking.profiles?.full_name ?? 'Unknown'}</span>
                            {booking.profiles?.student_id && (
                                <span className="ml-2 text-xs font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400">
                                    {booking.profiles.student_id}
                                </span>
                            )}
                        </p>
                    </div>
                    <span className="text-xs font-mono text-gray-500 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                        {booking.assets?.qr_code ?? '—'}
                    </span>
                </div>

                {/* 日期信息区块 */}
                {(startDate || endDate) && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            <span>Booking Period:</span>
                            <span className="text-gray-200 font-medium">
                                {formatDateTimeRange(startDate, endDate)}
                            </span>
                            {borrowDays !== null && (
                                <span className="text-xs text-gray-500">({borrowDays} days)</span>
                            )}
                        </div>

                        {actualReturnDate && (
                            <div className="flex items-center gap-1.5 text-gray-400">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Actual Return:</span>
                                <span className="text-gray-200 font-medium">{formatDateTime(actualReturnDate)}</span>
                            </div>
                        )}

                        {/* 逾期/按时 badge */}
                        {actualReturnDate && endDate && (
                            isOverdue ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                    Overdue {overdueDays} day{overdueDays !== 1 ? 's' : ''}
                                    <span className="text-red-300 opacity-80">
                                        · 预计扣 -{calcOverduePenalty(overdueDays!)} 分
                                    </span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    On Time
                                </span>
                            )
                        )}
                    </div>
                )}
            </div>

            {/* Photo comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {/* Left: Pickup photo */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]" />
                        Pickup / Original Photo
                    </h4>
                    {pickupPhoto ? (
                        <img
                            src={pickupPhoto}
                            alt="Pickup condition"
                            className="w-full aspect-[4/3] object-cover rounded-xl border border-white/10 shadow-sm"
                        />
                    ) : (
                        <PhotoPlaceholder label="No pickup photo recorded" />
                    )}
                </div>

                {/* Right: Return photo */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                        Return Photo
                    </h4>
                    {returnPhoto ? (
                        <img
                            src={returnPhoto}
                            alt="Return condition"
                            className="w-full aspect-[4/3] object-cover rounded-xl border border-white/10 shadow-sm"
                        />
                    ) : (
                        <PhotoPlaceholder label="No return photo uploaded" />
                    )}
                </div>
            </div>

            {/* Action buttons — 根据是否已有学生提交的损坏报告显示不同按钮 */}
            {existingDamageReport ? (
                // 学生已提交损坏报告：提示管理员，提供确认归还 + 跳转查看报告
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] space-y-3">
                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-300 leading-snug">
                            <span className="font-semibold">A damage report already exists for this return.</span>
                            <span className="text-amber-400/80"> Please acknowledge the return and review the report on the Damage Reports page.</span>
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                        <a
                            href="/dashboard/damage"
                            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-all"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View Damage Report →
                        </a>
                        <button
                            onClick={() => onAcknowledgeWithDamage?.(booking.id)}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all
                                       bg-gradient-to-r from-emerald-600 to-teal-600
                                       hover:from-emerald-500 hover:to-teal-500
                                       shadow-[0_0_14px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Acknowledge Return (Damage Reported)
                        </button>
                    </div>
                </div>
            ) : (
                // 无损坏报告：显示原有的两个按钮
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <button
                        onClick={() => onVerify(booking.id, true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all shadow-[0_0_10px_rgba(244,63,94,0.1)] hover:shadow-[0_0_16px_rgba(244,63,94,0.2)]"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Report Damage
                    </button>
                    <button
                        onClick={() => onVerify(booking.id, false)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all
                                   bg-gradient-to-r from-emerald-600 to-teal-600
                                   hover:from-emerald-500 hover:to-teal-500
                                   shadow-[0_0_14px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Confirm Return (No Damage)
                    </button>
                </div>
            )}
        </div>
    );
}
