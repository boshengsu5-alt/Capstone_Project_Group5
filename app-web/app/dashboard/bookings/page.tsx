// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BookingTable from '@/components/bookings/BookingTable';
import ApprovalModal from '@/components/bookings/ApprovalModal';
import DamageSeverityModal from '@/components/damage/DamageSeverityModal';
import { bookingService, BookingWithDetails } from '@/lib/bookingService';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { ClipboardList, RefreshCw, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/exportUtils';
import type { BookingStatus } from '@/types/database';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getDamageSeverityLabel, getStatusLabel } from '@/lib/i18n';

export default function BookingsPage() {
    const { t, locale } = useLanguage();
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 从 URL 查询参数读取初始筛选状态（如 ?status=pending）
    const validStatuses: (BookingStatus | 'all')[] = ['all', 'pending', 'approved', 'active', 'lost_reported', 'lost', 'returned', 'overdue', 'rejected', 'cancelled'];
    const initialStatus = validStatuses.includes(searchParams.get('status') as any)
        ? (searchParams.get('status') as 'all' | BookingStatus)
        : 'all';
    const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>(initialStatus);

    // Approval modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
    const [newBookingId, setNewBookingId] = useState<string | null>(null);

    // Damage severity modal state
    const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
    const [damageTargetBooking, setDamageTargetBooking] = useState<BookingWithDetails | null>(null);
    const statusOptions: { value: 'all' | BookingStatus; label: string }[] = [
        { value: 'all', label: t('bookings.allStatus') },
        { value: 'pending', label: getStatusLabel('pending', t) },
        { value: 'approved', label: getStatusLabel('approved', t) },
        { value: 'active', label: getStatusLabel('active', t) },
        { value: 'lost_reported', label: getStatusLabel('lost_reported', t) },
        { value: 'lost', label: getStatusLabel('lost', t) },
        { value: 'returned', label: getStatusLabel('returned', t) },
        { value: 'overdue', label: getStatusLabel('overdue', t) },
        { value: 'rejected', label: getStatusLabel('rejected', t) },
        { value: 'cancelled', label: getStatusLabel('cancelled', t) },
    ];

    const loadBookings = async () => {
        setIsLoading(true);
        try {
            const data = await bookingService.getBookings();
            setBookings(data || []);
        } catch (error) {
            console.error('Failed to load bookings:', error);
            showToast(t('bookings.loadFailed'), 'error');
            setBookings([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();

        const channel = (supabase as any)
          .channel('bookings-page-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' },
            (payload: any) => {
              if (payload.new && payload.new.id) {
                setNewBookingId(payload.new.id);
                setTimeout(() => setNewBookingId(null), 2000);
              }
              loadBookings();
            }
          )
          .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const filteredBookings = statusFilter === 'all'
        ? bookings
        : bookings.filter(b => b.status === statusFilter);

    const handleExport = () => {
        if (filteredBookings.length === 0) {
            showToast(t('bookings.noDataToExport'), 'info');
            return;
        }
        const exportData = filteredBookings.map(b => ({
            [t('tables.asset')]: b.assets?.name || t('common.none'),
            [t('tables.borrower')]: b.profiles?.full_name || t('common.none'),
            [t('users.studentId')]: b.profiles?.student_id || t('common.none'),
            [t('tables.startDate')]: new Date(b.start_date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US'),
            [t('tables.endDate')]: new Date(b.end_date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US'),
            [t('tables.status')]: getStatusLabel(b.status, t),
            [t('tables.createdAt')]: new Date(b.created_at).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US'),
        }));
        try {
            exportToExcel(exportData, `Bookings_Report_${new Date().toISOString().split('T')[0]}`, t('bookings.exportSheet'));
            showToast(t('bookings.exportSuccess'), 'success');
        } catch { showToast(t('bookings.exportFailed'), 'error'); }
    };

    const handleReviewClick = (booking: BookingWithDetails) => {
        setSelectedBooking(booking);
        setIsModalOpen(true);
    };

    const handleReportDamageClick = (booking: BookingWithDetails) => {
        setDamageTargetBooking(booking);
        setIsDamageModalOpen(true);
    };

    const handleDamageSeveritySelect = async (severity: 'minor' | 'moderate' | 'severe' | 'lost', description: string) => {
        if (!damageTargetBooking) return;
        setIsDamageModalOpen(false);
        setDamageTargetBooking(null);
        try {
            const success = await bookingService.reportDamage(damageTargetBooking.id, severity, description);
            if (success) {
                showToast(t('bookings.damageReported', { severity: getDamageSeverityLabel(severity, t) }), 'success');
                await loadBookings();
            } else {
                showToast(t('bookings.reportDamageFailed'), 'error');
            }
        } catch {
            showToast(t('bookings.networkError'), 'error');
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const user = await getCurrentUser();
            const success = await bookingService.approveBooking(id, user?.id);
            if (success) {
                showToast(t('bookings.approveSuccess'), 'success');
                await loadBookings();
            } else {
                showToast(t('bookings.approveFailed'), 'error');
            }
        } catch {
            showToast(t('bookings.networkError'), 'error');
        }
    };

    const handleReject = async (id: string, reason: string) => {
        try {
            const user = await getCurrentUser();
            const success = await bookingService.rejectBooking(id, reason, user?.id);
            if (success) {
                showToast(t('bookings.rejectSuccess'), 'info');
                await loadBookings();
            } else {
                showToast(t('bookings.rejectFailed'), 'error');
            }
        } catch {
            showToast(t('bookings.networkError'), 'error');
        }
    };

    return (
        <div className="flex flex-1 flex-col overflow-y-auto bg-[#050505] text-gray-100">
            <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-8 p-6 lg:p-10">

                {/* Header */}
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-2xl bg-violet-500/10 p-3">
                                <ClipboardList className="h-5 w-5 text-violet-300" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-violet-300">{t('bookings.eyebrow')}</p>
                                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{t('bookings.title')}</h1>
                            </div>
                        </div>
                        <p className="max-w-3xl text-sm leading-6 text-gray-400">
                            {t('bookings.subtitle')}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 self-start">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | BookingStatus)}
                            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-200 outline-none transition focus:border-violet-400 focus:bg-white/[0.06]"
                        >
                            {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-gray-900 text-gray-200">{opt.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.07]"
                        >
                            <Download className="w-4 h-4" /> {t('bookings.export')}
                        </button>
                        <button
                            onClick={() => loadBookings()}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.07] disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            {t('common.refresh')}
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                {isLoading ? (
                    <div className="flex h-64 w-full flex-col items-center justify-center rounded-3xl border border-white/5 bg-gray-900/40 backdrop-blur-sm">
                        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
                        <p className="text-gray-400 font-medium">{t('bookings.loading')}</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                        <BookingTable
                            bookings={filteredBookings}
                            onReview={handleReviewClick}
                            onReportDamage={handleReportDamageClick}
                            highlightId={newBookingId}
                        />
                    </div>
                )}

                {/* Approval Modal */}
                <ApprovalModal
                    isOpen={isModalOpen}
                    booking={selectedBooking}
                    onClose={() => { setIsModalOpen(false); setSelectedBooking(null); }}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />

                {/* Damage Severity Modal */}
                <DamageSeverityModal
                    isOpen={isDamageModalOpen}
                    booking={damageTargetBooking}
                    onSelect={handleDamageSeveritySelect}
                    onClose={() => { setIsDamageModalOpen(false); setDamageTargetBooking(null); }}
                />
            </main>
        </div>
    );
}
