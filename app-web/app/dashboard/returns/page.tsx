'use client';

import React, { useEffect, useState } from 'react';
import { bookingService, BookingWithDetails } from '@/lib/bookingService';
import ReturnVerify from '@/components/returns/ReturnVerify';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function ReturnsPage() {
    const { showToast } = useToast();
    const [returns, setReturns] = useState<BookingWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const loadReturns = async () => {
        setIsLoading(true);
        try {
            const allBookings = await bookingService.getBookings();
            // 筛选需要管理员验证的归还记录：
            // - active 且学生已上传归还照片（准备归还）
            // - returned 但尚未由管理员确认
            const pendingReturns = allBookings.filter(b =>
                (b.status === 'active' && b.return_photo_url) ||
                b.status === 'returned'
            );

            setReturns(pendingReturns);
        } catch (error) {
            console.error('Failed to load returns:', error);
            showToast('Failed to load returns. Please check your connection.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadReturns();
    }, []);

    const handleVerify = async (id: string, isDamaged: boolean) => {
        try {
            if (isDamaged) {
                // In a real app, this would open a damage report modal or redirect
                await bookingService.createDamageReport(id, 'Item reported damaged during return verification', 'moderate');
                showToast('已创建损坏报告，资产状态已更新', 'info');
            } else {
                await bookingService.processReturn(id, 'returned');
                showToast('归还验证通过', 'success');
            }

            // Remove from local list to simulate processing
            setReturns(prev => prev.filter(r => r.id !== id));
            if (selectedId === id) setSelectedId(null);

            // Refresh data
            await loadReturns();
        } catch (error) {
            console.error('Verification failed', error);
            showToast('验证操作失败，网络连接异常', 'error');
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Return Verifications</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Compare pickup and return condition photos to verify returned assets.
                    </p>
                </div>
                <div className="mt-4 md:mt-0">
                    <button
                        onClick={loadReturns}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <span className={isLoading ? "animate-spin" : ""}>↻</span> Refresh
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="w-full h-64 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading items pending verification...</p>
                </div>
            ) : returns.length === 0 ? (
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Catch up on returns!</h3>
                    <p className="text-sm text-gray-500 max-w-sm">There are no pending equipment returns awaiting verification at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-medium text-gray-700">Needs Verification ({returns.length})</h3>
                        </div>
                        <ul className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                            {returns.map(booking => (
                                <li
                                    key={booking.id}
                                    onClick={() => setSelectedId(booking.id === selectedId ? null : booking.id)}
                                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between ${selectedId === booking.id ? 'bg-purple-50/30' : ''}`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 sm:gap-4">
                                        <div className="font-medium text-gray-900">{booking.assets?.name} <span className="text-xs text-gray-500 font-mono ml-2">{booking.assets?.qr_code}</span></div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <span>Returned by</span>
                                            <span className="font-medium text-gray-700">{booking.profiles?.full_name}</span>
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-purple-600">
                                        {selectedId === booking.id ? 'Hide Details' : 'Verify Now'}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Show selected verification details below */}
                    {selectedId && returns.find(r => r.id === selectedId) && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <ReturnVerify
                                booking={returns.find(r => r.id === selectedId)!}
                                onVerify={handleVerify}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
