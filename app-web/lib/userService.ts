'use client';

import { supabase } from '@/lib/supabase';
import type { BookingStatus, CreditScoreLog } from '@/types/database';

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

const CREDIT_REASON_LABELS: Record<string, string> = {
  overdue_booking: 'Overdue return penalty',
  overdue_day1: 'Overdue checkpoint: day 1',
  overdue_day7: 'Overdue checkpoint: day 7',
  overdue_day30_lost: 'Marked as lost after 30 overdue days',
  return_bonus: 'Successful return bonus',
  damage_minor: 'Damage penalty: minor',
  damage_moderate: 'Damage penalty: moderate',
  damage_severe: 'Damage penalty: severe',
  admin_manual: 'Manual credit adjustment',
  e2e_test_cleanup: 'System credit adjustment',
};

function humanizeReason(reason: string): string {
  return reason
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getCreditReasonLabel(reason: string): string {
  return CREDIT_REASON_LABELS[reason] ?? humanizeReason(reason);
}

export async function getUserDetailStats(userId: string): Promise<UserDetailStats> {
  const [bookingsResult, latestCreditResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status')
      .eq('borrower_id', userId),
    supabase
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
    ? await supabase
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
  const { data, error } = await supabase
    .from('credit_score_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
