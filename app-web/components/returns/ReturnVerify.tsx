'use client';

import { useState } from 'react';
import { BookingWithDetails } from '@/lib/bookingService';
import { CheckCircle, AlertOctagon, ExternalLink } from 'lucide-react';

interface ReturnVerifyProps {
    booking: BookingWithDetails;
    onVerify: (id: string, isDamaged: boolean, severity?: string, photoUrl?: string) => Promise<void>;
}

export default function ReturnVerify({ booking, onVerify }: ReturnVerifyProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSeverityModal, setShowSeverityModal] = useState(false);

    const handleAction = async (isDamaged: boolean, severity?: string) => {
        setIsSubmitting(true);
        try {
            const returnPhoto = booking.return_photo_url || '';
            await onVerify(booking.id, isDamaged, severity, returnPhoto);
        } catch (error) {
            console.error('Failed to verify return', error);
        } finally {
            setIsSubmitting(false);
            setShowSeverityModal(false);
        }
    };

    // 优先使用实际拍摄的照片，没有时回退到资产商品图，都没有则为空
    const assetImage = booking.assets?.images?.[0] || '';
    const pickupPhoto = booking.pickup_photo_url || assetImage;
    const returnPhoto = booking.return_photo_url || '';

    return (
        <div className="bg-white border text-card-foreground shadow-sm rounded-xl overflow-hidden mt-6 relative">
            {/* Severity Selection Modal */}
            {showSeverityModal && (
                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="max-w-md w-full bg-white rounded-xl shadow-2xl border p-6 space-y-6">
                        <div className="text-center">
                            <h4 className="text-xl font-bold text-gray-900">Select Damage Severity</h4>
                            <p className="text-sm text-gray-500 mt-2">选择损坏程度，创建损坏报告。信用分将在报告处理完成后扣减。</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => handleAction(true, 'minor')}
                                disabled={isSubmitting}
                                className="w-full py-3 px-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-medium hover:bg-amber-100 transition-colors flex justify-between items-center"
                            >
                                <span>Minor Wear (轻微磨损)</span>
                                <span className="bg-amber-200/50 px-2 py-0.5 rounded text-xs">-10 pts</span>
                            </button>
                            <button
                                onClick={() => handleAction(true, 'moderate')}
                                disabled={isSubmitting}
                                className="w-full py-3 px-4 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg font-medium hover:bg-orange-100 transition-colors flex justify-between items-center"
                            >
                                <span>Moderate Damage (中度损坏)</span>
                                <span className="bg-orange-200/50 px-2 py-0.5 rounded text-xs">-20 pts</span>
                            </button>
                            <button
                                onClick={() => handleAction(true, 'severe')}
                                disabled={isSubmitting}
                                className="w-full py-3 px-4 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors flex justify-between items-center"
                            >
                                <span>Severe Damage (严重损坏)</span>
                                <span className="bg-red-200/50 px-2 py-0.5 rounded text-xs">-50 pts</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setShowSeverityModal(false)}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="p-6 border-b bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Return Verification</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Asset: <span className="font-semibold">{booking.assets?.name} ({booking.assets?.qr_code})</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Borrower: <span className="font-semibold text-purple-600">{booking.profiles?.full_name}</span>
                        <span className="text-xs ml-1 text-gray-400">({booking.profiles?.student_id})</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowSeverityModal(true)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md disabled:opacity-50"
                    >
                        <AlertOctagon className="w-4 h-4" />
                        Report Damage
                    </button>
                    <button
                        onClick={() => handleAction(false)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 rounded-md disabled:opacity-50 shadow-sm"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Verify Intact
                    </button>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pickup Condition */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Condition at Pickup
                        </h4>
                        <span className="text-xs text-gray-500">
                            {new Date(booking.start_date || '').toLocaleDateString()}
                        </span>
                    </div>
                    <div className="relative aspect-video rounded-lg overflow-hidden border bg-gray-100 group">
                        {pickupPhoto ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={pickupPhoto}
                                    alt="Condition at pickup"
                                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <a href={pickupPhoto} target="_blank" rel="noreferrer" className="p-2 bg-white/90 rounded-full text-gray-700 hover:text-gray-900 shadow-sm">
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <span className="text-sm">No pickup photo</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Return Condition */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            Condition at Return
                        </h4>
                        <span className="text-xs text-gray-500">
                            {booking.actual_return_date ? new Date(booking.actual_return_date).toLocaleDateString() : 'Just now'}
                        </span>
                    </div>
                    <div className="relative aspect-video rounded-lg overflow-hidden border bg-gray-100 group">
                        {returnPhoto ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={returnPhoto}
                                    alt="Condition at return"
                                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <a href={returnPhoto} target="_blank" rel="noreferrer" className="p-2 bg-white/90 rounded-full text-gray-700 hover:text-gray-900 shadow-sm">
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <span className="text-sm">No return photo</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {booking.notes && (
                <div className="px-6 py-4 bg-gray-50 border-t border-b text-sm">
                    <span className="font-medium text-gray-700">Borrower Notes: </span>
                    <span className="text-gray-600 italic">"{booking.notes}"</span>
                </div>
            )}
        </div>
    );
}
