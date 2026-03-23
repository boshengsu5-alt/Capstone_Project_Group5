'use client';

import React, { useState } from 'react';
import { BookingWithDetails } from '@/lib/bookingService';
import { CheckCircle, AlertOctagon, ExternalLink } from 'lucide-react';

interface ReturnVerifyProps {
    booking: BookingWithDetails;
    onVerify: (id: string, isDamaged: boolean) => Promise<void>;
}

export default function ReturnVerify({ booking, onVerify }: ReturnVerifyProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAction = async (isDamaged: boolean) => {
        setIsSubmitting(true);
        try {
            await onVerify(booking.id, isDamaged);
        } catch (error) {
            console.error('Failed to verify return', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 优先使用实际拍摄的照片，没有时回退到资产商品图，都没有则为空
    const assetImage = booking.assets?.images?.[0] || '';
    const pickupPhoto = booking.pickup_photo_url || assetImage;
    const returnPhoto = booking.return_photo_url || '';

    return (
        <div className="bg-white border text-card-foreground shadow-sm rounded-xl overflow-hidden mt-6">
            <div className="p-6 border-b bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold leading-none tracking-tight">Return Verification</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Asset: <span className="font-medium text-gray-900">{booking.assets?.name || 'Unknown Asset'}</span> ({booking.assets?.qr_code})
                    </p>
                    <p className="text-sm text-gray-500">
                        Borrower: <span className="font-medium text-gray-900">{booking.profiles?.full_name || 'Unknown'}</span> ({booking.profiles?.student_id})
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleAction(true)}
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
