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
 * 归还验证照片对比组件：左侧出库记录图，右侧归还实拍图
 */
export default function ReturnVerify({ booking, onVerify }: ReturnVerifyProps) {
    // 出库照片（资产原始图片，从 assets 关联取得）
    const pickupPhoto = booking.pickup_photo_url || null;
    // 归还照片（学生归还时拍摄上传）
    const returnPhoto = booking.return_photo_url || null;

    const PhotoPlaceholder = ({ label }: { label: string }) => (
        <div className="w-full aspect-[4/3] bg-gray-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
            <ImageIcon className="w-12 h-12 text-gray-300 mb-2" />
            <span className="text-sm text-gray-400 font-medium">{label}</span>
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* 顶部信息栏 */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {booking.assets?.name ?? 'Unknown Asset'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Returned by <span className="font-medium text-gray-700">{booking.profiles?.full_name ?? 'Unknown'}</span>
                            {booking.profiles?.student_id && (
                                <span className="ml-2 text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                    {booking.profiles.student_id}
                                </span>
                            )}
                        </p>
                    </div>
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        {booking.assets?.qr_code ?? '—'}
                    </span>
                </div>
            </div>

            {/* 照片对比区域：左右分栏 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {/* 左侧：出库记录照片 */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Pickup / Original Photo
                    </h4>
                    {pickupPhoto ? (
                        <img
                            src={pickupPhoto}
                            alt="Pickup condition"
                            className="w-full aspect-[4/3] object-cover rounded-xl border border-gray-200 shadow-sm"
                        />
                    ) : (
                        <PhotoPlaceholder label="No pickup photo recorded" />
                    )}
                </div>

                {/* 右侧：归还实拍照片 */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Return Photo
                    </h4>
                    {returnPhoto ? (
                        <img
                            src={returnPhoto}
                            alt="Return condition"
                            className="w-full aspect-[4/3] object-cover rounded-xl border border-gray-200 shadow-sm"
                        />
                    ) : (
                        <PhotoPlaceholder label="No return photo uploaded" />
                    )}
                </div>
            </div>

            {/* 底部操作按钮 */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                    onClick={() => onVerify(booking.id, true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                >
                    <AlertTriangle className="w-4 h-4" />
                    Report Damage
                </button>
                <button
                    onClick={() => onVerify(booking.id, false)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
                >
                    <CheckCircle className="w-4 h-4" />
                    Confirm Return (No Damage)
                </button>
            </div>
        </div>
    );
}
