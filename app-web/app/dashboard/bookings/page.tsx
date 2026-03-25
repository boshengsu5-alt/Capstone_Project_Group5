'use client';

import React, { useEffect, useState } from 'react';
import BookingTable from '@/components/bookings/BookingTable';
import ApprovalModal from '@/components/bookings/ApprovalModal';
import { bookingService, BookingWithDetails } from '@/lib/bookingService';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { ClipboardList, RefreshCw, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/exportUtils';
import type { BookingStatus } from '@/types/database';

const STATUS_OPTIONS: { value: 'all' | BookingStatus; label: string }[] = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'active', label: 'Active' },
    { value: 'returned', label: 'Returned' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
];

export default function BookingsPage() {
    const { showToast } = useToast();
    const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
    const [newBookingId, setNewBookingId] = useState<string | null>(null);

    const loadBookings = async () => {
        setIsLoading(true);
        try {
            const data = await bookingService.getBookings();
            setBookings(data || []);
        } catch (error) {
            console.error('Failed to load bookings:', error);
            showToast('Failed to load bookings. Please check your connection.', 'error');
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
            showToast('No data to export', 'info');
            return;
        }
        const statusMap: Record<string, string> = {
            pending: '待审批', approved: '已批准', active: '借出中',
            returned: '已归还', overdue: '逾期', rejected: '已拒绝', cancelled: '已取消',
        };
        const exportData = filteredBookings.map(b => ({
            'Asset': b.assets?.name || 'N/A',
            'Borrower': b.profiles?.full_name || 'N/A',
            'ID': b.profiles?.student_id || 'N/A',
            'Start': new Date(b.start_date).toLocaleDateString(),
            'End': new Date(b.end_date).toLocaleDateString(),
            'Status': statusMap[b.status] || b.status,
            'Created': new Date(b.created_at).toLocaleString(),
        }));
        try {
            exportToExcel(exportData, `Bookings_Report_${new Date().toISOString().split('T')[0]}`, 'Bookings');
            showToast('Report exported successfully', 'success');
        } catch { showToast('Export failed', 'error'); }
    };

    const handleReviewClick = (booking: BookingWithDetails) => {
        setSelectedBooking(booking);
        setIsModalOpen(true);
    };

    const handleApprove = async (id: string) => {
        try {
            const { data: { user } } = await (await import('@/lib/supabase')).supabase.auth.getUser();
            const success = await bookingService.approveBooking(id, user?.id);
            if (success) {
                showToast('Booking approved successfully', 'success');
                await loadBookings();
            } else {
                showToast('Approve operation failed', 'error');
            }
        } catch {
            showToast('Network error, connection failed', 'error');
        }
    };

    const handleReject = async (id: string, reason: string) => {
        try {
            const { data: { user } } = await (await import('@/lib/supabase')).supabase.auth.getUser();
            const success = await bookingService.rejectBooking(id, reason, user?.id);
            if (success) {
                showToast('Booking rejected, notification sent', 'info');
                await loadBookings();
            } else {
                showToast('Reject operation failed', 'error');
            }
        } catch {
            showToast('Network error, operation failed', 'error');
        }
    };

    return (
        <div className="flex flex-col flex-1 h-full w-full bg-[#050505] text-gray-100 overflow-y-auto">
            <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <ClipboardList className="w-5 h-5 text-purple-400" />
                            <h1 className="text-2xl font-bold text-white tracking-tight">Booking Requests</h1>
                        </div>
                        <p className="text-sm text-gray-500">
                            Review and manage equipment borrowing applications from students.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | BookingStatus)}
                            className="rounded-xl border border-white/10 bg-gray-900/60 px-3 py-2 text-sm text-gray-200 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-sm backdrop-blur-sm"
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-gray-900 text-gray-200">{opt.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-900/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors shadow-sm backdrop-blur-sm"
                        >
                            <Download className="w-4 h-4" /> Export
                        </button>
                        <button
                            onClick={() => loadBookings()}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-900/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors shadow-sm disabled:opacity-50 backdrop-blur-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                {isLoading ? (
                    <div className="w-full h-64 flex flex-col items-center justify-center bg-gray-900/40 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-gray-400 font-medium">Loading requests...</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                        <BookingTable
                            bookings={filteredBookings}
                            onReview={handleReviewClick}
                            highlightId={newBookingId}
                        />
                    </div>
                )}

                {/* Modal */}
                <ApprovalModal
                    isOpen={isModalOpen}
                    booking={selectedBooking}
                    onClose={() => { setIsModalOpen(false); setSelectedBooking(null); }}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            </main>
        </div>
    );
}
