'use client';

import React, { useState } from 'react';
import { BookingWithDetails } from '@/lib/bookingService';

interface ApprovalModalProps {
    isOpen: boolean;
    booking: BookingWithDetails | null;
    onClose: () => void;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string, reason: string) => Promise<void>;
}

export default function ApprovalModal({
    isOpen,
    booking,
    onClose,
    onApprove,
    onReject
}: ApprovalModalProps) {
    const [rejectionReason, setRejectionReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'decision' | 'reject'>('decision');

    if (!isOpen || !booking) return null;

    const handleApprove = async () => {
        setIsLoading(true);
        try {
            await onApprove(booking.id);
            resetAndClose();
        } catch (error) {
            console.error('Failed to approve booking:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            alert('Please provide a reason for rejection.');
            return;
        }
        setIsLoading(true);
        try {
            await onReject(booking.id, rejectionReason);
            resetAndClose();
        } catch (error) {
            console.error('Failed to reject booking:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetAndClose = () => {
        setMode('decision');
        setRejectionReason('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {mode === 'decision' ? 'Review Booking Request' : 'Reject Booking'}
                    </h2>
                    <button
                        onClick={resetAndClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-6 bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                        <p className="mb-2"><span className="font-semibold text-gray-900">Asset:</span> {booking.assets?.name ?? 'Unknown Asset'}</p>
                        <p className="mb-2"><span className="font-semibold text-gray-900">Borrower:</span> {booking.profiles?.full_name ?? 'Unknown User'} ({booking.profiles?.student_id})</p>
                        <p className="mb-2"><span className="font-semibold text-gray-900">Dates:</span> {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}</p>
                        <p><span className="font-semibold text-gray-900">Notes:</span> {booking.notes || 'None'}</p>
                    </div>

                    {mode === 'decision' ? (
                        <p className="text-gray-600 mb-6 font-medium text-center">
                            Do you want to approve or reject this request?
                        </p>
                    ) : (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Briefly explain why this request is denied..."
                                disabled={isLoading}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end items-center">
                    {mode === 'decision' ? (
                        <>
                            <button
                                onClick={() => setMode('reject')}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                                Reject Request
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isLoading ? 'Approving...' : 'Approve Request'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setMode('decision')}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isLoading || !rejectionReason.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
