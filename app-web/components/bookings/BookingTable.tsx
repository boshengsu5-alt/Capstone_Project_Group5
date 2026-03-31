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
    // dismissed 之外的任何状态（open/investigating/resolved）都视为「已有有效报告」，禁止重复报告
    const hasActiveDamageReport = (booking: BookingWithDetails) =>
        Array.isArray(booking.damage_reports)
        && booking.damage_reports.some((report) => report.status !== 'dismissed');

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                        {t('status.pending')}
                    </span>
                );
            case 'approved':
                return (
                    <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                        {t('status.approved')}
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400">
                        {t('status.rejected')}
                    </span>
                );
            case 'active':
                return (
                    <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
                        {t('status.active')}
                    </span>
                );
            case 'lost_reported':
                return (
                    <span className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-300">
                        {t('status.lost_reported')}
                    </span>
                );
            case 'lost':
                return (
                    <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300">
                        {t('status.lost')}
                    </span>
                );
            case 'returned':
                return (
                    <span className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400">
                        {t('status.returned')}
                    </span>
                );
            case 'overdue':
                return (
                    <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
                        {t('status.overdue')}
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center rounded-full border border-gray-500/20 bg-gray-500/10 px-2.5 py-1 text-xs font-semibold text-gray-400">
                        {t('status.cancelled')}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center rounded-full border border-gray-500/20 bg-gray-500/10 px-2.5 py-1 text-xs font-semibold text-gray-400">
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
                <h3 className="text-lg font-medium text-white mb-1">{t('bookings.noBookings')}</h3>
                <p className="text-sm text-gray-500 max-w-sm">{t('bookings.noBookingsSub')}</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-white/5 bg-gray-900/40 backdrop-blur-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                    <thead className="bg-white/5">
                        <tr>
                            <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-bold uppercase tracking-[0.24em] text-gray-500">{t('tables.asset')}</th>
                            <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-[0.24em] text-gray-500">{t('tables.user')}</th>
                            <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-[0.24em] text-gray-500">{t('tables.date')}</th>
                            <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-[0.24em] text-gray-500">{t('tables.status')}</th>
                            <th scope="col" className="py-4 pl-3 pr-6 text-right text-xs font-bold uppercase tracking-[0.24em] text-gray-500">{t('tables.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {bookings.map((booking) => (
                            <tr
                                key={booking.id}
                                className={cn(
                                    'group transition-colors hover:bg-white/[0.04]',
                                    highlightId === booking.id && "animate-highlight-gold ring-1 ring-amber-400/30"
                                )}
                            >
                                <td className="py-4 pl-6 pr-3">
                                    <div className="flex items-center gap-3">
                                        {booking.assets?.images?.[0] ? (
                                            <img
                                                src={booking.assets.images[0]}
                                                alt=""
                                                className="h-11 w-11 rounded-xl border border-white/10 object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="h-11 w-11 rounded-xl border border-white/10 bg-white/5 flex-shrink-0" />
                                        )}
                                        <div>
                                            <p className="text-sm font-semibold text-white">{booking.assets?.name ?? t('common.unknownAsset')}</p>
                                            <p className="mt-1 text-xs text-gray-500 font-mono">{booking.assets?.qr_code ?? t('common.none')}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-4">
                                    <p className="text-sm font-medium text-gray-200">{booking.profiles?.full_name ?? t('common.unknownUser')}</p>
                                    <p className="mt-1 text-xs font-mono text-gray-500">{booking.profiles?.student_id ?? t('common.noId')}</p>
                                </td>
                                <td className="px-3 py-4">
                                    <p className="text-sm text-gray-200">{formatDateTime(booking.start_date)}</p>
                                    <p className="mt-1 text-xs text-gray-500">{t('bookings.reportDateTo')} {formatDateTime(booking.end_date)}</p>
                                </td>
                                <td className="px-3 py-4">
                                    {getStatusBadge(booking.status)}
                                </td>
                                <td className="py-4 pl-3 pr-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {/* 仅对 overdue / returned 状态显示；已有任何非 dismissed 的损坏报告就隐藏，避免重复创建 */}
                                        {onReportDamage &&
                                            ['overdue', 'returned'].includes(booking.status) &&
                                            booking.rejection_reason !== 'VERIFIED' &&
                                            !hasActiveDamageReport(booking) && (
                                            <button
                                                onClick={() => onReportDamage(booking)}
                                                className="inline-flex items-center rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15"
                                            >
                                                {t('bookings.reportDamage')}
                                            </button>
                                        )}
                                        {booking.status === 'pending' ? (
                                            <button
                                                onClick={() => onReview(booking)}
                                                className="inline-flex items-center rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/15"
                                            >
                                                {t('bookings.review')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onReview(booking)}
                                                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/10"
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
