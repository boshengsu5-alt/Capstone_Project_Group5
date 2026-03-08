'use client';

import React from 'react';
import { BookingWithDetails } from '@/lib/bookingService';

interface BookingTableProps {
    bookings: BookingWithDetails[];
    onReview: (booking: BookingWithDetails) => void;
}

export default function BookingTable({ bookings, onReview }: BookingTableProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending Approval</span>;
            case 'approved':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Approved</span>;
            case 'rejected':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
            case 'active':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Active (Borrowed)</span>;
            case 'returned':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Returned</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    if (bookings.length === 0) {
        return (
            <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
                <p className="text-sm text-gray-500 max-w-sm">When students request equipment, their applications will appear here for your review.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50/80 border-b border-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600">Asset</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600">Borrower</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600">Period</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600">Status</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {bookings.map((booking) => (
                            <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{booking.assets?.name ?? 'Unknown Asset'}</div>
                                    <div className="text-gray-500 text-xs mt-0.5 mt-1 font-mono">{booking.assets?.qr_code ?? 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-gray-900">{booking.profiles?.full_name ?? 'Unknown'}</div>
                                    <div className="text-gray-500 text-xs mt-0.5">{booking.profiles?.student_id ?? 'No ID'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-gray-900">{new Date(booking.start_date).toLocaleDateString()}</div>
                                    <div className="text-gray-500 text-xs mt-0.5">to {new Date(booking.end_date).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(booking.status)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {booking.status === 'pending' ? (
                                        <button
                                            onClick={() => onReview(booking)}
                                            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors group-hover:shadow-sm"
                                        >
                                            Review
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onReview(booking)}
                                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                                        >
                                            View Details
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
