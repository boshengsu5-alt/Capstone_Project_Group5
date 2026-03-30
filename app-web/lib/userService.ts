'use client';

import { supabase } from '@/lib/supabase';
import { getStoredLocale, translations } from '@/lib/i18n';
import type { BookingStatus, CreditScoreLog, UserRole } from '@/types/database';

// Hand-written Database types and Supabase client generics do not fully align for
// updates/RPC calls in this repo. Keep a local alias to preserve runtime behavior.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface UserDetailStats {
  totalBookings: number;
  openBookings: number;
  overdueBookings: number;
  damageReports: number;
  latestCreditLog: CreditScoreLog | null;
}

interface BookingSummary {
  id: string;
  status: BookingStatus;
}

const OPEN_BOOKING_STATUSES: BookingStatus[] = ['approved', 'active', 'overdue', 'suspended'];

function humanizeReason(reason: string): string {
  return reason
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getCreditReasonLabel(reason: string): string {
  const locale = getStoredLocale();
  return translations[locale].creditReasons[reason as keyof typeof translations.en.creditReasons] ?? humanizeReason(reason);
}

export async function getUserDetailStats(userId: string): Promise<UserDetailStats> {
  const [bookingsResult, latestCreditResult] = await Promise.all([
    db
      .from('bookings')
      .select('id, status')
      .eq('borrower_id', userId),
    db
      .from('credit_score_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (bookingsResult.error) {
    throw bookingsResult.error;
  }

  if (latestCreditResult.error) {
    throw latestCreditResult.error;
  }

  const bookings = (bookingsResult.data ?? []) as BookingSummary[];
  const bookingIds = bookings.map((booking) => booking.id);

  const { count: damageReports, error: damageError } = bookingIds.length
    ? await db
        .from('damage_reports')
        .select('id', { count: 'exact', head: true })
        .in('booking_id', bookingIds)
    : { count: 0, error: null };

  if (damageError) {
    throw damageError;
  }

  return {
    totalBookings: bookings.length,
    openBookings: bookings.filter((booking) => OPEN_BOOKING_STATUSES.includes(booking.status)).length,
    overdueBookings: bookings.filter((booking) => booking.status === 'overdue').length,
    damageReports: damageReports ?? 0,
    latestCreditLog: latestCreditResult.data ?? null,
  };
}

export async function getUserCreditLogs(userId: string): Promise<CreditScoreLog[]> {
  const { data, error } = await db
    .from('credit_score_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

interface UpdateUserProfileInput {
  userId: string;
  role: UserRole;
  creditScore: number;
  currentRole: UserRole;
  currentCreditScore: number;
}

export async function updateUserProfile({
  userId,
  role,
  creditScore,
  currentRole,
  currentCreditScore,
}: UpdateUserProfileInput): Promise<void> {
  const nextCreditScore = Math.max(0, Math.min(200, Math.round(creditScore)));
  const creditDelta = nextCreditScore - currentCreditScore;

  if (role !== currentRole) {
    const { data, error } = await db
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        getStoredLocale() === 'zh'
          ? '用户角色更新被阻止，请确认管理员权限是否正确。'
          : 'User role update was blocked. Please verify admin permissions.'
      );
    }
  }

  if (creditDelta !== 0) {
    const { error } = await db.rpc('update_credit_score', {
      p_user_id: userId,
      p_delta: creditDelta,
      p_reason: 'admin_manual',
    });

    if (error) {
      throw error;
    }
  }
}
