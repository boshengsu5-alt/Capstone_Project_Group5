'use client';

import React from 'react';
import { BookingWithDetails } from '@/lib/bookingService';

interface BookingTableProps {
    bookings: BookingWithDetails[];
    onReview: (booking: BookingWithDetails) => void;
    highlightId?: string | null;
}

export default function BookingTable({ bookings, onReview, highlightId }: BookingTableProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100/80 text-amber-700 border border-amber-200">Pending Approval</span>;
            case 'approved':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Approved</span>;
            case 'rejected':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Rejected</span>;
            case 'active':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>Active (Borrowed)</span>;
            case 'returned':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Returned</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">{status}</span>;
        }
    };

    if (bookings.length === 0) {
        return (
            <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No bookings found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">When students request equipment, their applications will appear here for your review.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Asset</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Borrower</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Period</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {bookings.map((booking, index) => (
                            <tr
                                key={booking.id}
                                className={`transition-colors group hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 ${booking.id === highlightId ? 'bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-300' : index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/30 dark:bg-gray-800/30'}`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {booking.assets?.images?.[0] ? (
                                            <img src={booking.assets.images[0]} alt={booking.assets?.name ?? ''} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{booking.assets?.name ?? 'Unknown Asset'}</div>
                                            <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-mono">{booking.assets?.qr_code ?? 'N/A'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-gray-900 dark:text-gray-100">{booking.profiles?.full_name ?? 'Unknown'}</div>
                                    <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{booking.profiles?.student_id ?? 'No ID'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-gray-900 dark:text-gray-100">{new Date(booking.start_date).toLocaleDateString()}</div>
                                    <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">to {new Date(booking.end_date).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(booking.status)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {booking.status === 'pending' ? (
                                        <button
                                            onClick={() => onReview(booking)}
                                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-sm group-hover:shadow-md active:scale-95"
                                        >
                                            Review
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onReview(booking)}
                                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors shadow-sm"
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
