'use client';

import React, { useEffect, useState } from 'react';
import { bookingService, BookingWithDetails } from '@/lib/bookingService';
import ReturnVerify from '@/components/returns/ReturnVerify';
import DamageSeverityModal from '@/components/damage/DamageSeverityModal';
import { AlertCircle, CheckCircle2, RefreshCw, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function ReturnsPage() {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [returns, setReturns] = useState<BookingWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // 损坏程度弹窗：等待管理员选择严重程度
    const [damageTargetBooking, setDamageTargetBooking] = useState<BookingWithDetails | null>(null);

    const loadReturns = async () => {
        setIsLoading(true);
        try {
            const allBookings = await bookingService.getBookings();
            // 筛选待验证的归还：active 且有归还照片，或 returned 未验证
            // 排除已验证的（rejection_reason === 'VERIFIED'）
            const pendingReturns = allBookings.filter(b =>
                ((b.status === 'active' && b.return_photo_url) ||
                b.status === 'returned') &&
                b.rejection_reason !== 'VERIFIED'
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
        if (isDamaged) {
            // 打开损坏程度选择弹窗，等待管理员选择
            const booking = returns.find(r => r.id === id) ?? null;
            setDamageTargetBooking(booking);
            return;
        }

        // 无损归还
        try {
            await bookingService.processReturn(id, 'returned');
            showToast('Return verification passed', 'success');
            setReturns(prev => prev.filter(r => r.id !== id));
            if (selectedId === id) setSelectedId(null);
            await loadReturns();
        } catch (error) {
            console.error('Verification failed', error);
            showToast('Verification failed, network error', 'error');
        }
    };

    const handleDamageSeveritySelect = async (severity: 'minor' | 'moderate' | 'severe', description: string) => {
        if (!damageTargetBooking) return;
        const bookingId = damageTargetBooking.id;
        setDamageTargetBooking(null);
        setSelectedId(null);

        try {
            const success = await bookingService.reportDamage(bookingId, severity, description);
            if (success) {
                showToast(`Damage reported (${severity}). Pending review on Damage Reports page.`, 'success');
                setReturns(prev => prev.filter(r => r.id !== bookingId));
                await loadReturns();
            } else {
                showToast('Failed to create damage report', 'error');
            }
        } catch (error) {
            console.error('Damage report failed', error);
            showToast('Verification failed, network error', 'error');
        }
    };

    return (
        <div className="flex flex-col flex-1 h-full w-full bg-[#050505] text-gray-100 overflow-y-auto">
            <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <RotateCcw className="w-5 h-5 text-amber-400" />
                            <h1 className="text-2xl font-bold text-white tracking-tight">{t('returns.title')}</h1>
                        </div>
                        <p className="text-sm text-gray-500">
                            {t('returns.subtitle')}
                        </p>
                    </div>
                    <button
                        onClick={loadReturns}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-900/60 border border-white/10 rounded-xl hover:bg-white/5 transition-colors shadow-sm disabled:opacity-50 backdrop-blur-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        {t('common.refresh')}
                    </button>
                </div>

                {isLoading ? (
                    <div className="w-full h-64 flex flex-col items-center justify-center bg-gray-900/40 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-gray-400 font-medium">Loading items pending verification...</p>
                    </div>
                ) : returns.length === 0 ? (
                    <div className="w-full bg-gray-900/40 rounded-2xl border border-white/5 p-12 flex flex-col items-center justify-center text-center backdrop-blur-sm">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-1">{t('returns.allCaughtUp')}</h3>
                        <p className="text-sm text-gray-500 max-w-sm">{t('returns.noPending')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {/* Pending list */}
                        <div className="bg-gray-900/40 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm">
                            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-400" />
                                <h3 className="text-sm font-semibold text-gray-200">
                                    {t('returns.needsVerify')}
                                    <span className="ml-2 text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                                        {returns.length}
                                    </span>
                                </h3>
                            </div>
                            <ul className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                                {returns.map(booking => (
                                    <li
                                        key={booking.id}
                                        onClick={() => setSelectedId(booking.id === selectedId ? null : booking.id)}
                                        className={`px-5 py-4 hover:bg-white/5 cursor-pointer transition-colors flex items-center justify-between ${
                                            selectedId === booking.id
                                                ? 'bg-purple-500/5 border-l-2 border-purple-500'
                                                : 'border-l-2 border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {booking.assets?.images?.[0] ? (
                                                <img src={booking.assets.images[0]} alt={booking.assets?.name ?? ''} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                    <RotateCcw className="w-5 h-5 text-gray-500" />
                                                </div>
                                            )}
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 sm:gap-4">
                                                <div className="font-medium text-white">
                                                    {booking.assets?.name}
                                                    <span className="text-xs text-gray-500 font-mono ml-2">{booking.assets?.qr_code}</span>
                                                </div>
                                                <div className="text-sm text-gray-500 flex items-center gap-1.5">
                                                    {t('returns.returnedBy')}
                                                    <span className="font-medium text-gray-300">{booking.profiles?.full_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                                            selectedId === booking.id
                                                ? 'text-purple-300 bg-purple-500/10 border border-purple-500/30'
                                                : 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                                        }`}>
                                            {selectedId === booking.id ? t('returns.hideDetails') : t('returns.verifyNow')}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Verification detail panel */}
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
            </main>

            {/* 损坏程度选择弹窗 */}
            <DamageSeverityModal
                isOpen={damageTargetBooking !== null}
                booking={damageTargetBooking}
                onSelect={handleDamageSeveritySelect}
                onClose={() => setDamageTargetBooking(null)}
            />
        </div>
    );
}
