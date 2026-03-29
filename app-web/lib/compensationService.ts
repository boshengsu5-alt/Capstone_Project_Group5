import { supabase } from '@/lib/supabase';
import type {
  CompensationCase,
  CompensationCaseUpdate,
  CompensationRecord,
  CompensationStatus,
  Database,
} from '@/types/database';
import {
  buildCompensationReference,
  DEFAULT_COMPENSATION_CONTACT,
  estimateCompensationAmount,
  getOutstandingAmount,
  getSuggestedCompensationStatus,
} from '@/lib/compensation';

// Hand-written Database types and the current Supabase client generics do not align
// perfectly for inserts/updates. Use a local alias so runtime behavior stays the same.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type LiableProfile = Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'student_id' | 'email'> | null;
type CompensationAsset = Pick<Database['public']['Tables']['assets']['Row'], 'name' | 'images' | 'purchase_price' | 'purchase_date'> | null;
type CompensationBooking = Pick<Database['public']['Tables']['bookings']['Row'], 'id' | 'start_date' | 'end_date' | 'actual_return_date' | 'borrower_id'> | null;
type CompensationDamageReport = Pick<
  Database['public']['Tables']['damage_reports']['Row'],
  'id' | 'severity' | 'status' | 'description' | 'resolution_notes' | 'created_at' | 'updated_at' | 'reporter_id' | 'auto_generated'
> | null;

export type CompensationRecordWithDetails = CompensationRecord;

export type CompensationCaseWithDetails = CompensationCase & {
  assets: CompensationAsset;
  bookings: CompensationBooking;
  damage_reports: CompensationDamageReport;
  profiles: LiableProfile;
  compensation_records: CompensationRecordWithDetails[] | null;
};

interface DamageReportForSync {
  id: string;
  severity: string;
  status: string;
  description: string;
  resolution_notes: string;
  reporter_id: string;
  auto_generated: boolean;
  booking_id: string;
  asset_id: string;
  bookings: {
    id: string;
    borrower_id: string;
    assets: {
      name: string;
      purchase_price: number | null;
      purchase_date: string | null;
    } | null;
  } | null;
}

interface CompensationCaseRow {
  id: string;
  liable_user_id: string;
  status: CompensationStatus;
  assessed_amount: number | null;
  agreed_amount: number | null;
  paid_amount: number;
  payment_reference: string;
  due_date: string | null;
  admin_notes: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  contact_office: string;
  office_hours: string;
}

export interface UpdateCompensationCaseInput {
  caseId: string;
  status: CompensationStatus;
  assessedAmount: number | null;
  agreedAmount: number | null;
  dueDate: string | null;
  paymentReference: string;
  adminNotes: string;
  paymentAmount?: number;
  paymentMethod?: string;
  paymentNote?: string;
  paymentRecordReference?: string;
}

function roundMoney(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.round(value * 100) / 100;
}

function getCaseStatusLabel(status: CompensationStatus): string {
  switch (status) {
    case 'under_review':
      return 'Under Review';
    case 'awaiting_signature':
      return 'Awaiting Signature';
    case 'awaiting_payment':
      return 'Awaiting Payment';
    case 'partially_paid':
      return 'Partially Paid';
    case 'paid':
      return 'Paid';
    case 'waived':
      return 'Waived';
    default:
      return status;
  }
}

function sortRecords(records: CompensationRecordWithDetails[] | null | undefined) {
  return [...(records ?? [])].sort((a, b) => (
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ));
}

function shouldMirrorAssessedAmount(status: CompensationStatus, paidAmount: number): boolean {
  return ['under_review', 'awaiting_signature'].includes(status) && paidAmount <= 0;
}

function getEffectiveAgreedAmount(
  status: CompensationStatus,
  agreedAmount: number | null | undefined,
  assessedAmount: number | null | undefined,
  paidAmount: number,
): number | null {
  if (shouldMirrorAssessedAmount(status, paidAmount)) {
    return roundMoney(assessedAmount);
  }

  return roundMoney(agreedAmount ?? assessedAmount);
}

async function insertCompensationRecord(payload: {
  compensation_case_id: string;
  record_type: CompensationRecord['record_type'];
  title: string;
  description: string;
  amount?: number | null;
  payment_method?: string;
  reference_no?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();

  await db
    .from('compensation_records')
    .insert({
      compensation_case_id: payload.compensation_case_id,
      record_type: payload.record_type,
      title: payload.title,
      description: payload.description,
      amount: roundMoney(payload.amount),
      payment_method: payload.payment_method ?? '',
      reference_no: payload.reference_no ?? '',
      created_by: user?.id ?? null,
    });
}

async function insertCompensationNotification(payload: {
  userId: string;
  assetName: string;
  stage: string;
  status: CompensationStatus;
  assessedAmount: number | null;
  agreedAmount: number | null;
  paidAmount: number;
  dueDate: string | null;
  paymentReference: string;
  paymentAmount?: number;
}) {
  const outstandingAmount = getOutstandingAmount(payload.agreedAmount, payload.assessedAmount, payload.paidAmount);

  const stageCopy: Record<string, { title: string; message: string }> = {
    under_review: {
      title: 'Compensation Case Opened',
      message: `A compensation case for "${payload.assetName}" has been opened. The current estimate is ¥${(payload.assessedAmount ?? 0).toLocaleString()}.`,
    },
    awaiting_signature: {
      title: 'Compensation Amount Confirmed',
      message: `The final compensation for "${payload.assetName}" is ready for your confirmation. Please contact the asset office to sign the acknowledgement form.`,
    },
    awaiting_payment: {
      title: 'Compensation Payment Requested',
      message: `Payment is now required for "${payload.assetName}". Please settle the outstanding amount before the due date.`,
    },
    partially_paid: {
      title: 'Partial Compensation Received',
      message: `A partial payment for "${payload.assetName}" has been recorded. Please complete the remaining balance on time.`,
    },
    paid: {
      title: 'Compensation Fully Paid',
      message: `The compensation case for "${payload.assetName}" has been marked as fully paid. Thank you for completing the settlement.`,
    },
    waived: {
      title: 'Compensation Waived',
      message: `The compensation case for "${payload.assetName}" has been waived. No further payment is required.`,
    },
    payment_recorded: {
      title: 'Compensation Payment Recorded',
      message: `A payment of ¥${(payload.paymentAmount ?? 0).toLocaleString()} has been recorded for "${payload.assetName}".`,
    },
  };

  const content = stageCopy[payload.stage] ?? stageCopy[payload.status];

  await db
    .from('notifications')
    .insert({
      user_id: payload.userId,
      type: 'compensation_update',
      title: content.title,
      message: content.message,
      metadata: {
        stage: payload.stage,
        status: payload.status,
        asset_name: payload.assetName,
        assessed_amount: payload.assessedAmount,
        agreed_amount: payload.agreedAmount,
        paid_amount: payload.paidAmount,
        outstanding_amount: outstandingAmount,
        due_date: payload.dueDate,
        payment_reference: payload.paymentReference,
        payment_amount: payload.paymentAmount ?? null,
      },
    });
}

async function getDamageReportForSync(reportId: string): Promise<DamageReportForSync | null> {
  const { data, error } = await db
    .from('damage_reports')
    .select(`
      id,
      severity,
      status,
      description,
      resolution_notes,
      reporter_id,
      auto_generated,
      booking_id,
      asset_id,
      bookings (
        id,
        borrower_id,
        assets ( name, purchase_price, purchase_date )
      )
    `)
    .eq('id', reportId)
    .single();

  if (error) {
    console.error('Failed to fetch damage report for compensation sync:', error);
    return null;
  }

  return data as unknown as DamageReportForSync;
}

async function getCompensationCaseByReportId(reportId: string): Promise<CompensationCaseRow | null> {
  const { data, error } = await db
    .from('compensation_cases')
    .select(`
      id,
      liable_user_id,
      status,
      assessed_amount,
      agreed_amount,
      paid_amount,
      payment_reference,
      due_date,
      admin_notes,
      contact_person,
      contact_email,
      contact_phone,
      contact_office,
      office_hours
    `)
    .eq('damage_report_id', reportId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch compensation case:', error);
    return null;
  }

  return data as CompensationCaseRow | null;
}

export const compensationService = {
  async getCompensationCases(): Promise<CompensationCaseWithDetails[]> {
    const { data, error } = await db
      .from('compensation_cases')
      .select(`
        *,
        assets ( name, images, purchase_price, purchase_date ),
        bookings ( id, start_date, end_date, actual_return_date, borrower_id ),
        damage_reports ( id, severity, status, description, resolution_notes, created_at, updated_at, reporter_id, auto_generated ),
        profiles!liable_user_id ( full_name, student_id, email ),
        compensation_records ( id, compensation_case_id, record_type, title, description, amount, payment_method, reference_no, created_by, created_at )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch compensation cases:', error);
      return [];
    }

    return ((data ?? []) as CompensationCaseWithDetails[]).map((item) => ({
      ...item,
      agreed_amount: getEffectiveAgreedAmount(
        item.status,
        item.agreed_amount,
        item.assessed_amount,
        item.paid_amount,
      ),
      compensation_records: sortRecords(item.compensation_records),
    }));
  },

  async syncCaseFromDamageReport(reportId: string): Promise<void> {
    const report = await getDamageReportForSync(reportId);
    if (!report?.bookings) return;

    const assetName = report.bookings.assets?.name ?? 'the asset';
    const assessedAmount = roundMoney(estimateCompensationAmount({
      purchasePrice: report.bookings.assets?.purchase_price ?? null,
      purchaseDate: report.bookings.assets?.purchase_date ?? null,
      severity: report.severity,
      reportStatus: report.status,
      autoGenerated: report.auto_generated,
      reporterId: report.reporter_id,
      borrowerId: report.bookings.borrower_id,
    }));

    const existingCase = await getCompensationCaseByReportId(reportId);
    const currentPaid = existingCase?.paid_amount ?? 0;
    const statusForAgreement = existingCase?.status ?? (
      report.status === 'resolved'
        ? 'awaiting_signature'
        : 'under_review'
    );
    const agreedAmount = report.status === 'dismissed'
      ? 0
      : getEffectiveAgreedAmount(
        statusForAgreement,
        existingCase?.agreed_amount,
        assessedAmount,
        currentPaid,
      );

    let nextStatus: CompensationStatus;
    if (report.status === 'dismissed') {
      nextStatus = 'waived';
    } else if (
      existingCase &&
      ['awaiting_payment', 'partially_paid', 'paid'].includes(existingCase.status)
    ) {
      nextStatus = existingCase.status;
    } else {
      nextStatus = getSuggestedCompensationStatus(report.status, agreedAmount, currentPaid);
    }

    const paymentReference = existingCase?.payment_reference || buildCompensationReference(report.id);
    const dueDate = report.status === 'resolved'
      ? existingCase?.due_date ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : existingCase?.due_date ?? null;

    const payload: CompensationCaseUpdate = {
      status: nextStatus,
      assessed_amount: assessedAmount,
      agreed_amount: roundMoney(
        nextStatus === 'waived'
          ? 0
          : agreedAmount
      ),
      paid_amount: roundMoney(currentPaid) ?? 0,
      payment_reference: paymentReference,
      due_date: nextStatus === 'waived' ? null : dueDate,
      admin_notes: existingCase?.admin_notes ?? '',
      contact_person: existingCase?.contact_person ?? DEFAULT_COMPENSATION_CONTACT.person,
      contact_email: existingCase?.contact_email ?? DEFAULT_COMPENSATION_CONTACT.email,
      contact_phone: existingCase?.contact_phone ?? DEFAULT_COMPENSATION_CONTACT.phone,
      contact_office: existingCase?.contact_office ?? DEFAULT_COMPENSATION_CONTACT.office,
      office_hours: existingCase?.office_hours ?? DEFAULT_COMPENSATION_CONTACT.officeHours,
    };

    if (existingCase) {
      await db
        .from('compensation_cases')
        .update(payload)
        .eq('id', existingCase.id);
    } else {
      const { data: createdCase } = await db
        .from('compensation_cases')
        .insert({
          damage_report_id: report.id,
          booking_id: report.booking_id,
          asset_id: report.asset_id,
          liable_user_id: report.bookings.borrower_id,
          status: payload.status!,
          assessed_amount: payload.assessed_amount ?? null,
          agreed_amount: payload.agreed_amount ?? null,
          paid_amount: payload.paid_amount ?? 0,
          payment_reference: payload.payment_reference ?? buildCompensationReference(report.id),
          due_date: payload.due_date ?? null,
          admin_notes: payload.admin_notes ?? '',
          contact_person: payload.contact_person ?? DEFAULT_COMPENSATION_CONTACT.person,
          contact_email: payload.contact_email ?? DEFAULT_COMPENSATION_CONTACT.email,
          contact_phone: payload.contact_phone ?? DEFAULT_COMPENSATION_CONTACT.phone,
          contact_office: payload.contact_office ?? DEFAULT_COMPENSATION_CONTACT.office,
          office_hours: payload.office_hours ?? DEFAULT_COMPENSATION_CONTACT.officeHours,
        })
        .select('id')
        .single();

      if (createdCase) {
        await insertCompensationRecord({
          compensation_case_id: createdCase.id,
          record_type: 'assessment',
          title: 'Compensation case created',
          description: `A compensation case was opened for ${assetName}.`,
          amount: roundMoney(assessedAmount),
        });
      }
    }

    if (
      !existingCase
      || existingCase.status !== payload.status
      || existingCase.assessed_amount !== payload.assessed_amount
      || existingCase.agreed_amount !== payload.agreed_amount
    ) {
      const caseId = existingCase?.id ?? (await getCompensationCaseByReportId(reportId))?.id;

      if (caseId) {
        await insertCompensationRecord({
          compensation_case_id: caseId,
          record_type: payload.status === 'waived' ? 'adjustment' : 'assessment',
          title: payload.status === 'waived'
            ? 'Compensation waived'
            : payload.status === 'awaiting_signature'
              ? 'Compensation amount confirmed'
              : 'Compensation estimate refreshed',
          description: payload.status === 'waived'
            ? `The compensation for ${assetName} has been waived based on the latest damage review result.`
            : `The latest assessed compensation for ${assetName} is ¥${((payload.agreed_amount ?? payload.assessed_amount) ?? 0).toLocaleString()}.`,
          amount: payload.agreed_amount ?? payload.assessed_amount,
        });
      }

      await insertCompensationNotification({
        userId: report.bookings.borrower_id,
        assetName,
        stage: payload.status === 'awaiting_signature' ? 'awaiting_signature' : (payload.status ?? nextStatus),
        status: payload.status ?? nextStatus,
        assessedAmount: payload.assessed_amount ?? null,
        agreedAmount: payload.agreed_amount ?? null,
        paidAmount: payload.paid_amount ?? 0,
        dueDate: payload.due_date ?? null,
        paymentReference,
      });
    }
  },

  async updateCompensationCase(input: UpdateCompensationCaseInput): Promise<boolean> {
    const { data: currentCase, error } = await db
      .from('compensation_cases')
      .select(`
        *,
        assets ( name ),
        profiles!liable_user_id ( full_name, student_id, email )
      `)
      .eq('id', input.caseId)
      .single();

    if (error || !currentCase) {
      console.error('Failed to load compensation case for update:', error);
      return false;
    }

    const baseAssessedAmount = roundMoney(input.assessedAmount);
    const baseAgreedAmount = roundMoney(input.agreedAmount ?? input.assessedAmount);
    const paymentAmount = roundMoney(input.paymentAmount) ?? 0;
    const nextPaidAmount = roundMoney(((currentCase as CompensationCase).paid_amount ?? 0) + paymentAmount) ?? 0;
    const targetAmount = baseAgreedAmount ?? baseAssessedAmount ?? 0;

    let nextStatus = input.status;
    if (nextStatus !== 'waived') {
      if (targetAmount <= 0) {
        nextStatus = 'waived';
      } else if (nextPaidAmount >= targetAmount) {
        nextStatus = 'paid';
      } else if (nextPaidAmount > 0) {
        nextStatus = 'partially_paid';
      }
    }

    const updatePayload: CompensationCaseUpdate = {
      status: nextStatus,
      assessed_amount: baseAssessedAmount,
      agreed_amount: nextStatus === 'waived' ? 0 : baseAgreedAmount,
      paid_amount: nextPaidAmount,
      due_date: nextStatus === 'waived' ? null : input.dueDate,
      payment_reference: input.paymentReference,
      admin_notes: input.adminNotes,
    };

    const { error: updateError } = await db
      .from('compensation_cases')
      .update(updatePayload)
      .eq('id', input.caseId);

    if (updateError) {
      console.error('Failed to update compensation case:', updateError);
      return false;
    }

    const previousCase = currentCase as CompensationCase & { assets: { name: string } | null; profiles: LiableProfile };
    const assetName = previousCase.assets?.name ?? 'the asset';
    const liableUserId = previousCase.liable_user_id;
    const outstandingAmount = getOutstandingAmount(
      updatePayload.agreed_amount ?? null,
      updatePayload.assessed_amount ?? null,
      updatePayload.paid_amount ?? 0,
    );

    if (
      previousCase.status !== updatePayload.status
      || previousCase.assessed_amount !== updatePayload.assessed_amount
      || previousCase.agreed_amount !== updatePayload.agreed_amount
      || previousCase.due_date !== updatePayload.due_date
      || previousCase.payment_reference !== updatePayload.payment_reference
      || previousCase.admin_notes !== updatePayload.admin_notes
    ) {
      await insertCompensationRecord({
        compensation_case_id: input.caseId,
        record_type: updatePayload.status === 'awaiting_payment' ? 'signature' : 'status_update',
        title: `Case updated: ${getCaseStatusLabel(updatePayload.status ?? previousCase.status)}`,
        description: [
          updatePayload.agreed_amount != null ? `Agreed amount: ¥${updatePayload.agreed_amount.toLocaleString()}` : null,
          updatePayload.due_date ? `Due date: ${new Date(updatePayload.due_date).toLocaleDateString('en-CA')}` : null,
          input.adminNotes ? `Notes: ${input.adminNotes}` : null,
        ].filter(Boolean).join(' · '),
        amount: updatePayload.agreed_amount ?? updatePayload.assessed_amount,
      });
    }

    if (paymentAmount > 0) {
      await insertCompensationRecord({
        compensation_case_id: input.caseId,
        record_type: 'payment',
        title: 'Payment received',
        description: input.paymentNote || 'A compensation payment was recorded by the admin.',
        amount: paymentAmount,
        payment_method: input.paymentMethod || 'Offline transfer',
        reference_no: input.paymentRecordReference || '',
      });
    }

    await insertCompensationNotification({
      userId: liableUserId,
      assetName,
      stage: paymentAmount > 0 ? 'payment_recorded' : updatePayload.status ?? previousCase.status,
      status: updatePayload.status ?? previousCase.status,
      assessedAmount: updatePayload.assessed_amount ?? null,
      agreedAmount: updatePayload.agreed_amount ?? null,
      paidAmount: updatePayload.paid_amount ?? 0,
      dueDate: updatePayload.due_date ?? null,
      paymentReference: updatePayload.payment_reference ?? '',
      paymentAmount,
    });

    if (paymentAmount > 0 || previousCase.status !== updatePayload.status) {
      await insertCompensationNotification({
        userId: liableUserId,
        assetName,
        stage: updatePayload.status ?? previousCase.status,
        status: updatePayload.status ?? previousCase.status,
        assessedAmount: updatePayload.assessed_amount ?? null,
        agreedAmount: updatePayload.agreed_amount ?? null,
        paidAmount: updatePayload.paid_amount ?? 0,
        dueDate: updatePayload.due_date ?? null,
        paymentReference: updatePayload.payment_reference ?? '',
      });
    }

    if (updatePayload.status === 'paid' && outstandingAmount <= 0) {
      await insertCompensationRecord({
        compensation_case_id: input.caseId,
        record_type: 'status_update',
        title: 'Case settled',
        description: `The compensation case for ${assetName} has been fully settled.`,
        amount: updatePayload.paid_amount ?? 0,
      });
    }

    return true;
  },
};
