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

    const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());

    const handleVerify = async (id: string, isDamaged: boolean, severity?: string, photoUrl?: string) => {
        try {
            if (isDamaged && severity) {
                // Now includes severity and photo URL as requested
                const result = await bookingService.createDamageReport(id, 'Item reported damaged during return verification', severity, photoUrl);
                
                if (result.success) {
                    const scoreMsg = result.scoreUpdated 
                        ? `信用分已从 ${result.oldScore} 降至 ${result.newScore}` 
                        : (result.oldScore === 0 ? '信用分已为 0，未再扣减' : '损坏报告已创建，但信用分未变化，请检查数据库状态');
                    showToast(`已创建损坏报告 (${severity})。${scoreMsg}`, result.scoreUpdated ? 'success' : 'warning');
                } else {
                    showToast('损坏报告创建失败', 'error');
                }
            } else {
                await bookingService.processReturn(id, 'returned');
                showToast('归还验证通过', 'success');
            }

            // Mark as verified in current session
            setVerifiedIds(prev => new Set(prev).add(id));
            
            // Note: We don't remove from returns list or nullify selectedId immediately 
            // to allow the "Completed" state to be visible.
            // Items with rejection_reason === 'VERIFIED' will be persistent.

        } catch (error) {
            console.error('Verification failed', error);
            showToast('验证操作失败，网络连接异常', 'error');
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Return Verifications</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Compare pickup and return condition photos to verify returned assets.
                    </p>
                </div>
                <div className="mt-4 md:mt-0">
                    <button
                        onClick={loadReturns}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <span className={isLoading ? "animate-spin" : ""}>↻</span> Refresh
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="w-full h-64 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading items pending verification...</p>
                </div>
            ) : returns.length === 0 ? (
                <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-500">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Catch up on returns!</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">There are no pending equipment returns awaiting verification at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="p-4 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Needs Verification ({returns.length})</h3>
                        </div>
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto">
                            {returns.map(booking => (
                                <li
                                    key={booking.id}
                                    onClick={() => setSelectedId(booking.id === selectedId ? null : booking.id)}
                                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors flex items-center justify-between ${selectedId === booking.id ? 'bg-purple-50/30 dark:bg-purple-900/20' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {booking.assets?.images?.[0] ? (
                                            <img src={booking.assets.images[0]} alt={booking.assets?.name ?? ''} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                                            </div>
                                        )}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 sm:gap-4">
                                        <div className="font-medium text-gray-900 dark:text-white">{booking.assets?.name} <span className="text-xs text-gray-500 dark:text-gray-400 font-mono ml-2">{booking.assets?.qr_code}</span></div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <span>Returned by</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{booking.profiles?.full_name}</span>
                                        </div>
                                    </div>
                                    </div>
                                    <div className="text-sm font-medium">
                                        {verifiedIds.has(booking.id) || booking.rejection_reason === 'VERIFIED' ? (
                                            <span className="text-green-600 flex items-center gap-1 font-semibold">
                                                <CheckCircle2 className="w-4 h-4" /> Verified
                                            </span>
                                        ) : (
                                            <span className="text-purple-600">
                                                {selectedId === booking.id ? 'Hide Details' : 'Verify Now'}
                                            </span>
                                        )}
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
                                isVerified={verifiedIds.has(selectedId)}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
