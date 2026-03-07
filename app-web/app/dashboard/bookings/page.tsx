'use client';

import React, { useEffect, useState } from 'react';
import BookingTable from '@/components/bookings/BookingTable';
import ApprovalModal from '@/components/bookings/ApprovalModal';
import { bookingService, BookingWithDetails } from '@/lib/bookingService';

export default function BookingsPage() {
    const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);

    // Fetch data
    const loadBookings = async () => {
        setIsLoading(true);
        try {
            const data = await bookingService.getBookings();
            setBookings(data);
        } catch (error) {
            console.error('Failed to load bookings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();
    }, []);

    // Handlers
    const handleReviewClick = (booking: BookingWithDetails) => {
        setSelectedBooking(booking);
        setIsModalOpen(true);
    };

    const handleApprove = async (id: string) => {
        // In a real app, you would pass the current admin's user ID here
        const success = await bookingService.approveBooking(id);
        if (success) {
            // Refresh list to show updated status
            await loadBookings();
        } else {
            alert('Failed to approve booking. Please try again.');
        }
    };

    const handleReject = async (id: string, reason: string) => {
        // In a real app, you would pass the current admin's user ID here
        const success = await bookingService.rejectBooking(id, reason);
        if (success) {
            // Refresh list to show updated status
            await loadBookings();
        } else {
            alert('Failed to reject booking. Please try again.');
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Booking Requests</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Review and manage equipment borrowing applications from students.
                    </p>
                </div>

                <div className="mt-4 md:mt-0">
                    {/* Future add-ons: filter dropdowns, date pickers, etc. */}
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
                <div className="w-full h-64 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading requests...</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                    <BookingTable bookings={bookings} onReview={handleReviewClick} />
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
