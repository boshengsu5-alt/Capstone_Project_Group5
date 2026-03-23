'use client';

import React, { useEffect, useState } from 'react';
import BookingTable from '@/components/bookings/BookingTable';
import ApprovalModal from '@/components/bookings/ApprovalModal';
import { bookingService, BookingWithDetails } from '@/lib/bookingService';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Download } from 'lucide-react';
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

    // Fetch data
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

        // --- Realtime Subscription ---
        const channel = (supabase as any)
          .channel('bookings-page-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'bookings'
            },
            (payload: any) => {
              console.log('Realtime update in bookings page:', payload);
              if (payload.new && payload.new.id) {
                setNewBookingId(payload.new.id);
                // Reset highlight after animation duration
                setTimeout(() => setNewBookingId(null), 2000);
              }
              loadBookings();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
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
            '资产名称': b.assets?.name || 'N/A',
            '借用人': b.profiles?.full_name || 'N/A',
            '学号': b.profiles?.student_id || 'N/A',
            '开始日期': new Date(b.start_date).toLocaleDateString(),
            '结束日期': new Date(b.end_date).toLocaleDateString(),
            '状态': statusMap[b.status] || b.status,
            '创建时间': new Date(b.created_at).toLocaleString(),
        }));
        try {
            exportToExcel(exportData, `借用记录_${new Date().toISOString().split('T')[0]}`, '借用记录');
            showToast('报表导出成功', 'success');
        } catch { showToast('导出失败', 'error'); }
    };

    // Handlers
    const handleReviewClick = (booking: BookingWithDetails) => {
        setSelectedBooking(booking);
        setIsModalOpen(true);
    };

    const handleApprove = async (id: string) => {
        try {
            // 获取当前管理员 ID，确保审批通知能正确发送给学生
            const { data: { user } } = await (await import('@/lib/supabase')).supabase.auth.getUser();
            const success = await bookingService.approveBooking(id, user?.id);
            if (success) {
                showToast('借用申请已批准', 'success');
                await loadBookings();
            } else {
                showToast('批准操作失败，请重试', 'error');
            }
        } catch (error) {
            showToast('网络异常，无法连接到 Supabase', 'error');
        }
    };

    const handleReject = async (id: string, reason: string) => {
        try {
            const { data: { user } } = await (await import('@/lib/supabase')).supabase.auth.getUser();
            const success = await bookingService.rejectBooking(id, reason, user?.id);
            if (success) {
                showToast('申请已拒绝，通知已发送', 'info');
                await loadBookings();
            } else {
                showToast('拒绝操作失败', 'error');
            }
        } catch (error) {
            showToast('网络异常，操作无法完成', 'error');
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Booking Requests</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Review and manage equipment borrowing applications from students.
                    </p>
                </div>

                <div className="mt-4 md:mt-0 flex items-center gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | BookingStatus)}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button
                        onClick={() => loadBookings()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <span className={isLoading ? "animate-spin" : ""}>↻</span> Refresh
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {isLoading ? (
                <div className="w-full h-64 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading requests...</p>
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
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedBooking(null);
                }}
                onApprove={handleApprove}
                onReject={handleReject}
            />
        </div>
    );
}
