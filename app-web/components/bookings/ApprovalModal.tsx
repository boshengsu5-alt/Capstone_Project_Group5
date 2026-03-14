'use client';

import { useState } from 'react';
import { BookingWithDetails } from '@/lib/bookingService';

interface ApprovalModalProps {
    isOpen: boolean;
    booking: BookingWithDetails | null;
    onClose: () => void;
    onApprove: (id: string) => void;
    onReject: (id: string, reason: string) => void;
}

/**
 * Modal for reviewing and approving/rejecting booking requests.
 * 借用审批弹窗，管理员可审批通过或拒绝并填写原因
 */
export default function ApprovalModal({ isOpen, booking, onClose, onApprove, onReject }: ApprovalModalProps) {
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mode, setMode] = useState<'review' | 'reject'>('review');

    if (!isOpen || !booking) return null;

    const handleApprove = async () => {
        setIsSubmitting(true);
        await onApprove(booking.id);
        setIsSubmitting(false);
        handleClose();
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) return;
        setIsSubmitting(true);
        await onReject(booking.id, rejectionReason.trim());
        setIsSubmitting(false);
        handleClose();
    };

    const handleClose = () => {
        setRejectionReason('');
        setMode('review');
        onClose();
    };

    const statusLabel: Record<string, string> = {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        active: 'Active',
        returned: 'Returned',
        overdue: 'Overdue',
        cancelled: 'Cancelled',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Review Booking Request</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
                    >
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Booking Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 mb-1">Asset</p>
                            <p className="font-semibold text-gray-900">{booking.assets?.name ?? 'Unknown'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 mb-1">Borrower</p>
                            <p className="font-semibold text-gray-900">
                                {booking.profiles?.full_name ?? 'Unknown'}
                                {booking.profiles?.student_id && (
                                    <span className="text-gray-400 font-normal ml-1">({booking.profiles.student_id})</span>
                                )}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500 mb-1">Period</p>
                            <p className="font-semibold text-gray-900">{booking.start_date} ~ {booking.end_date}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 mb-1">Status</p>
                            <p className="font-semibold text-gray-900">{statusLabel[booking.status] ?? booking.status}</p>
                        </div>
                    </div>

                    {booking.notes && (
                        <div className="text-sm">
                            <p className="text-gray-500 mb-1">Notes</p>
                            <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{booking.notes}</p>
                        </div>
                    )}

                    {/* Rejection Reason Input */}
                    {mode === 'reject' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rejection Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Please provide a reason for rejection..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    {booking.status === 'pending' && mode === 'review' && (
                        <>
                            <button
                                onClick={() => setMode('reject')}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Reject
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Approving...' : 'Approve'}
                            </button>
                        </>
                    )}
                    {mode === 'reject' && (
                        <>
                            <button
                                onClick={() => { setMode('review'); setRejectionReason(''); }}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isSubmitting || !rejectionReason.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </>
                    )}
                    {booking.status !== 'pending' && mode === 'review' && (
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
