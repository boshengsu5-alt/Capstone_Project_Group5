// @ts-nocheck
'use client';

import React from 'react';
import { BookingWithDetails } from '@/lib/bookingService';
import { formatDateTime } from '@/lib/dateTime';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface BookingTableProps {
    bookings: BookingWithDetails[];
    onReview: (booking: BookingWithDetails) => void;
    onReportDamage?: (booking: BookingWithDetails) => void;
    highlightId?: string | null;
}

export default function BookingTable({ bookings, onReview, onReportDamage, highlightId }: BookingTableProps) {
    const { t } = useLanguage();
    const hasUnresolvedDamageReport = (booking: BookingWithDetails) =>
        Array.isArray(booking.damage_reports)
        && booking.damage_reports.some((report) => report.status === 'open' || report.status === 'investigating');

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                        {t('status.pending')}
                    </span>
                );
            case 'approved':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                        {t('status.approved')}
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.15)]">
                        {t('status.rejected')}
                    </span>
                );
            case 'active':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.15)]">
                        {t('status.active')}
                    </span>
                );
            case 'lost_reported':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-orange-500/10 text-orange-300 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.2)]">
                        {t('status.lost_reported')}
                    </span>
                );
            case 'lost':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-rose-500/10 text-rose-300 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                        {t('status.lost')}
                    </span>
                );
            case 'returned':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_8px_rgba(139,92,246,0.15)]">
                        {t('status.returned')}
                    </span>
                );
            case 'overdue':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)] animate-pulse">
                        {t('status.overdue')}
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-500/10 text-gray-400 border-gray-500/20">
                        {t('status.cancelled')}
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

    if (bookings.length === 0) {
        return (
            <div className="w-full bg-gray-900/40 rounded-2xl border border-white/5 p-12 flex flex-col items-center justify-center text-center backdrop-blur-sm">
                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-lg font-medium text-white mb-1">No bookings found</h3>
                <p className="text-sm text-gray-500 max-w-sm">When students request equipment, their applications will appear here for your review.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-gray-900/40 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('tables.asset')}</th>
                            <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('tables.user')}</th>
                            <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('tables.date')}</th>
                            <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('tables.status')}</th>
                            <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">{t('tables.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {bookings.map((booking) => (
                            <tr
                                key={booking.id}
                                className={cn(
                                    "hover:bg-white/5 transition-all group",
                                    highlightId === booking.id && "animate-highlight-gold ring-1 ring-amber-400/30"
                                )}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {booking.assets?.images?.[0] ? (
                                            <img
                                                src={booking.assets.images[0]}
                                                alt=""
                                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-gray-800 flex-shrink-0 border border-white/10" />
                                        )}
                                        <div>
                                            <div className="font-medium text-white">{booking.assets?.name ?? 'Unknown Asset'}</div>
                                            <div className="text-gray-500 text-xs mt-1 font-mono">{booking.assets?.qr_code ?? 'N/A'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-gray-200">{booking.profiles?.full_name ?? 'Unknown'}</div>
                                    <div className="text-gray-500 text-xs mt-0.5 font-mono">{booking.profiles?.student_id ?? 'No ID'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-gray-200 leading-tight">{formatDateTime(booking.start_date)}</div>
                                    <div className="text-gray-500 text-xs mt-1 leading-tight">to {formatDateTime(booking.end_date)}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(booking.status)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {/* 仅对 overdue / returned 状态显示；只要本借用已有损坏报告就隐藏，避免重复创建 */}
                                        {onReportDamage &&
                                            ['overdue', 'returned'].includes(booking.status) &&
                                            booking.rejection_reason !== 'VERIFIED' &&
                                            !hasUnresolvedDamageReport(booking) && (
                                            <button
                                                onClick={() => onReportDamage(booking)}
                                                className="px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                                            >
                                                Report Damage
                                            </button>
                                        )}
                                        {booking.status === 'pending' ? (
                                            <button
                                                onClick={() => onReview(booking)}
                                                className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg transition-all
                                                           bg-gradient-to-r from-purple-600 to-indigo-600
                                                           hover:from-purple-500 hover:to-indigo-500
                                                           shadow-[0_0_12px_rgba(139,92,246,0.35)] hover:shadow-[0_0_18px_rgba(139,92,246,0.5)]"
                                            >
                                                {t('bookings.review')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onReview(booking)}
                                                className="px-4 py-1.5 text-sm font-medium text-gray-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-gray-200 transition-colors"
                                            >
                                                {t('bookings.viewDetails')}
                                            </button>
                                        )}
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
