'use client';

import React from 'react';
import { CheckCircle, AlertTriangle, ImageIcon } from 'lucide-react';
import type { BookingWithDetails } from '@/lib/bookingService';

interface ReturnVerifyProps {
    booking: BookingWithDetails;
    onVerify: (id: string, isDamaged: boolean) => void;
}

/**
 * Side-by-side photo comparison for return verification.
 * Dark-themed version matching dashboard aesthetic.
 */
export default function ReturnVerify({ booking, onVerify }: ReturnVerifyProps) {
    const pickupPhoto = booking.pickup_photo_url || null;
    const returnPhoto = booking.return_photo_url || null;

    const PhotoPlaceholder = ({ label }: { label: string }) => (
        <div className="w-full aspect-[4/3] bg-white/5 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-white/10">
            <ImageIcon className="w-12 h-12 text-gray-600 mb-2" />
            <span className="text-sm text-gray-500 font-medium">{label}</span>
        </div>
    );

    return (
        <div className="bg-gray-900/40 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm">
            {/* Info bar */}
            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-white">
                        {booking.assets?.name ?? 'Unknown Asset'}
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Returned by{' '}
                        <span className="font-medium text-gray-200">{booking.profiles?.full_name ?? 'Unknown'}</span>
                        {booking.profiles?.student_id && (
                            <span className="ml-2 text-xs font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400">
                                {booking.profiles.student_id}
                            </span>
                        )}
                    </p>
                </div>
                <span className="text-xs font-mono text-gray-500 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                    {booking.assets?.qr_code ?? '—'}
                </span>
            </div>

            {/* Photo comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {/* Left: Pickup photo */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]" />
                        Pickup / Original Photo
                    </h4>
                    {pickupPhoto ? (
                        <img
                            src={pickupPhoto}
                            alt="Pickup condition"
                            className="w-full aspect-[4/3] object-cover rounded-xl border border-white/10 shadow-sm"
                        />
                    ) : (
                        <PhotoPlaceholder label="No pickup photo recorded" />
                    )}
                </div>

                {/* Right: Return photo */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                        Return Photo
                    </h4>
                    {returnPhoto ? (
                        <img
                            src={returnPhoto}
                            alt="Return condition"
                            className="w-full aspect-[4/3] object-cover rounded-xl border border-white/10 shadow-sm"
                        />
                    ) : (
                        <PhotoPlaceholder label="No return photo uploaded" />
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                    onClick={() => onVerify(booking.id, true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all shadow-[0_0_10px_rgba(244,63,94,0.1) ] hover:shadow-[0_0_16px_rgba(244,63,94,0.2)]"
                >
                    <AlertTriangle className="w-4 h-4" />
                    Report Damage
                </button>
                <button
                    onClick={() => onVerify(booking.id, false)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all
                               bg-gradient-to-r from-emerald-600 to-teal-600
                               hover:from-emerald-500 hover:to-teal-500
                               shadow-[0_0_14px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                >
                    <CheckCircle className="w-4 h-4" />
                    Confirm Return (No Damage)
                </button>
            </div>
        </div>
    );
}
