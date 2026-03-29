import { supabase } from './supabase';
import { getCurrentUser } from './authService';
import type {
  Asset,
  CompensationCase,
  CompensationRecord,
  CompensationStatus,
  DamageReport,
  Profile,
} from '../../../database/types/supabase';
import { getOutstandingAmount } from '../utils/compensation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type MyCompensationCase = CompensationCase & {
  assets: Pick<Asset, 'name' | 'images' | 'purchase_price' | 'purchase_date'> | null;
  bookings: {
    id: string;
    start_date: string;
    end_date: string;
    actual_return_date: string | null;
  } | null;
  damage_reports: Pick<DamageReport, 'id' | 'severity' | 'status' | 'description' | 'resolution_notes' | 'created_at' | 'updated_at'> | null;
  profiles: Pick<Profile, 'full_name' | 'student_id' | 'email'> | null;
  compensation_records: CompensationRecord[] | null;
};

export interface CompensationSummary {
  totalCases: number;
  activeCases: number;
  totalOutstanding: number;
  totalPaid: number;
}

function roundMoney(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.round(value * 100) / 100;
}

function getEffectiveAgreedAmount(
  status: CompensationStatus,
  agreedAmount: number | null | undefined,
  assessedAmount: number | null | undefined,
  paidAmount: number
): number | null {
  if (['under_review', 'awaiting_signature'].includes(status) && paidAmount <= 0) {
    return roundMoney(assessedAmount);
  }

  return roundMoney(agreedAmount ?? assessedAmount);
}

export async function getMyCompensationCases(): Promise<MyCompensationCase[]> {
  const user = await getCurrentUser();

  const { data, error } = await db
    .from('compensation_cases')
    .select(`
      *,
      assets ( name, images, purchase_price, purchase_date ),
      bookings ( id, start_date, end_date, actual_return_date ),
      damage_reports ( id, severity, status, description, resolution_notes, created_at, updated_at ),
      profiles!liable_user_id ( full_name, student_id, email ),
      compensation_records ( id, compensation_case_id, record_type, title, description, amount, payment_method, reference_no, created_by, created_at )
    `)
    .eq('liable_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as MyCompensationCase[]).map((item) => ({
    ...item,
    agreed_amount: getEffectiveAgreedAmount(
      item.status,
      item.agreed_amount,
      item.assessed_amount,
      item.paid_amount
    ),
    compensation_records: [...(item.compensation_records ?? [])].sort((a, b) => (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )),
  }));
}

export async function getMyCompensationSummary(): Promise<CompensationSummary> {
  const cases = await getMyCompensationCases();

  return cases.reduce<CompensationSummary>((summary, item) => {
    const outstanding = getOutstandingAmount(item.agreed_amount, item.assessed_amount, item.paid_amount);
    const isActive = item.status !== 'paid' && item.status !== 'waived';

    return {
      totalCases: summary.totalCases + 1,
      activeCases: summary.activeCases + (isActive ? 1 : 0),
      totalOutstanding: summary.totalOutstanding + outstanding,
      totalPaid: summary.totalPaid + item.paid_amount,
    };
  }, {
    totalCases: 0,
    activeCases: 0,
    totalOutstanding: 0,
    totalPaid: 0,
  });
}
