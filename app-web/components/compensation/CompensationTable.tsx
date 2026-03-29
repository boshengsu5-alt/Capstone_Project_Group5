'use client';

import { Fragment, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardPenLine,
  ContactRound,
  CreditCard,
  FileSignature,
  HandCoins,
  ReceiptText,
  Wallet,
  X,
} from 'lucide-react';
import { getOutstandingAmount } from '@/lib/compensation';
import { formatDateTime, formatDateTimeRange } from '@/lib/dateTime';
import type { CompensationCaseWithDetails, UpdateCompensationCaseInput } from '@/lib/compensationService';
import type { CompensationStatus } from '@/types/database';

interface CompensationTableProps {
  cases: CompensationCaseWithDetails[];
  onUpdateCase: (input: UpdateCompensationCaseInput) => Promise<void> | void;
  emptyTitle?: string;
  emptyMessage?: string;
}

const STATUS_OPTIONS: CompensationStatus[] = [
  'under_review',
  'awaiting_signature',
  'awaiting_payment',
  'partially_paid',
  'paid',
  'waived',
];

function getStatusMeta(status: CompensationStatus) {
  switch (status) {
    case 'under_review':
      return {
        label: 'Under Review',
        badge: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
      };
    case 'awaiting_signature':
      return {
        label: 'Awaiting Signature',
        badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
      };
    case 'awaiting_payment':
      return {
        label: 'Awaiting Payment',
        badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      };
    case 'partially_paid':
      return {
        label: 'Partially Paid',
        badge: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
      };
    case 'paid':
      return {
        label: 'Paid',
        badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      };
    case 'waived':
      return {
        label: 'Waived',
        badge: 'bg-gray-500/10 text-gray-300 border-gray-500/20',
      };
    default:
      return {
        label: status,
        badge: 'bg-white/5 text-gray-300 border-white/10',
      };
  }
}

function formatMoney(amount: number | null | undefined) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return 'Pending';
  return `¥${amount.toLocaleString()}`;
}

function RecordTypeBadge({ type }: { type: string }) {
  const label = {
    assessment: 'Assessment',
    status_update: 'Status Update',
    signature: 'Signature',
    payment: 'Payment',
    adjustment: 'Adjustment',
    note: 'Note',
  }[type] ?? type;

  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-300">
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: CompensationStatus }) {
  const meta = getStatusMeta(status);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.badge}`}>
      {meta.label}
    </span>
  );
}

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <span
      className={[
        'mt-1 h-2.5 w-2.5 rounded-full',
        done ? 'bg-emerald-400' : active ? 'bg-violet-400' : 'bg-white/15',
      ].join(' ')}
    />
  );
}

function ProcessGuide({ item }: { item: CompensationCaseWithDetails }) {
  const outstanding = getOutstandingAmount(item.agreed_amount, item.assessed_amount, item.paid_amount);
  const steps = [
    {
      key: 'review',
      title: '1. Damage review completed',
      text: 'The asset office confirms the final compensation amount after checking return photos, damage evidence, and the booking record.',
      done: item.status !== 'under_review',
      active: item.status === 'under_review',
    },
    {
      key: 'signature',
      title: '2. Sign the acknowledgement form',
      text: `The student contacts ${item.contact_person} at ${item.contact_office} during ${item.office_hours} to confirm the agreed amount and receive a payment reference.`,
      done: ['awaiting_payment', 'partially_paid', 'paid'].includes(item.status),
      active: item.status === 'awaiting_signature',
    },
    {
      key: 'payment',
      title: '3. Complete the payment',
      text: `Pay against reference ${item.payment_reference || 'to be assigned'} via the campus finance desk or approved bank transfer. Bring student ID and the booking number for verification.`,
      done: ['partially_paid', 'paid'].includes(item.status),
      active: item.status === 'awaiting_payment',
    },
    {
      key: 'close',
      title: '4. Finance confirmation and closure',
      text: outstanding > 0
        ? `A remaining balance of ${formatMoney(outstanding)} is still open. Once the balance reaches zero, the case can be marked as paid.`
        : 'The finance office confirms the receipt, uploads the payment record, and closes the case as paid.',
      done: item.status === 'paid' || item.status === 'waived',
      active: item.status === 'partially_paid',
    },
  ];

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardPenLine className="h-4 w-4 text-violet-300" />
        <h4 className="text-sm font-semibold text-white">Student Compensation Guide</h4>
      </div>
      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.key} className="flex gap-3">
            <StepDot active={step.active} done={step.done} />
            <div>
              <p className="text-sm font-semibold text-gray-100">{step.title}</p>
              <p className="mt-1 text-sm leading-6 text-gray-400">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-xs uppercase tracking-[0.18em] text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-200">{value}</span>
    </div>
  );
}

function ExpandedDetail({ item }: { item: CompensationCaseWithDetails }) {
  const outstanding = getOutstandingAmount(item.agreed_amount, item.assessed_amount, item.paid_amount);

  return (
    <div className="space-y-5 border-t border-white/5 bg-white/[0.02] px-6 py-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-amber-300">
            <CircleDollarSign className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Assessed</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatMoney(item.assessed_amount)}</p>
        </div>
        <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-violet-300">
            <FileSignature className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Agreed</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatMoney(item.agreed_amount)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-emerald-300">
            <HandCoins className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Paid</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatMoney(item.paid_amount)}</p>
        </div>
        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/5 px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-rose-300">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatMoney(outstanding)}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <ProcessGuide item={item} />

          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-amber-300" />
              <h4 className="text-sm font-semibold text-white">Compensation Record Log</h4>
            </div>

            <div className="space-y-3">
              {(item.compensation_records ?? []).map((record) => (
                <div key={record.id} className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{record.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatDateTime(record.created_at)}</p>
                    </div>
                    <RecordTypeBadge type={record.record_type} />
                  </div>
                  {record.description && (
                    <p className="mt-3 text-sm leading-6 text-gray-400">{record.description}</p>
                  )}
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {typeof record.amount === 'number' && (
                      <DetailRow label="Amount" value={formatMoney(record.amount)} />
                    )}
                    {record.payment_method && (
                      <DetailRow label="Method" value={record.payment_method} />
                    )}
                    {record.reference_no && (
                      <DetailRow label="Reference" value={record.reference_no} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-2">
              <ContactRound className="h-4 w-4 text-sky-300" />
              <h4 className="text-sm font-semibold text-white">Contact & Payment Instructions</h4>
            </div>
            <DetailRow label="Contact" value={item.contact_person} />
            <DetailRow label="Email" value={item.contact_email} />
            <DetailRow label="Phone" value={item.contact_phone} />
            <DetailRow label="Office" value={item.contact_office} />
            <DetailRow label="Hours" value={item.office_hours} />
            <DetailRow label="Reference" value={item.payment_reference || 'Pending assignment'} />
            <DetailRow label="Due Date" value={item.due_date ? formatDateTime(item.due_date) : 'To be scheduled'} />
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-emerald-300" />
              <h4 className="text-sm font-semibold text-white">Case Snapshot</h4>
            </div>
            <DetailRow
              label="Booking"
              value={formatDateTimeRange(item.bookings?.start_date ?? null, item.bookings?.end_date ?? null)}
            />
            <DetailRow label="Damage Severity" value={item.damage_reports?.severity ?? '—'} />
            <DetailRow label="Damage Status" value={item.damage_reports?.status ?? '—'} />
            <DetailRow label="Last Updated" value={formatDateTime(item.updated_at)} />
            {item.admin_notes && (
              <div className="mt-4 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Admin Notes</p>
                <p className="mt-2 text-sm leading-6 text-gray-300 whitespace-pre-wrap">{item.admin_notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UpdateModal({
  item,
  onClose,
  onSave,
}: {
  item: CompensationCaseWithDetails;
  onClose: () => void;
  onSave: (input: UpdateCompensationCaseInput) => Promise<void> | void;
}) {
  const [status, setStatus] = useState<CompensationStatus>(item.status);
  const [assessedAmount, setAssessedAmount] = useState(item.assessed_amount?.toString() ?? '');
  const [agreedAmount, setAgreedAmount] = useState(item.agreed_amount?.toString() ?? '');
  const [dueDate, setDueDate] = useState(item.due_date ? item.due_date.slice(0, 10) : '');
  const [paymentReference, setPaymentReference] = useState(item.payment_reference);
  const [adminNotes, setAdminNotes] = useState(item.admin_notes ?? '');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Campus cashier');
  const [paymentRecordReference, setPaymentRecordReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const outstanding = useMemo(() => {
    const assessed = assessedAmount ? Number(assessedAmount) : null;
    const agreed = agreedAmount ? Number(agreedAmount) : null;
    return getOutstandingAmount(agreed, assessed, item.paid_amount + (paymentAmount ? Number(paymentAmount) : 0));
  }, [agreedAmount, assessedAmount, item.paid_amount, paymentAmount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111111] shadow-2xl shadow-black/60 max-h-[90vh]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-white/5 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-violet-300">Compensation Workflow</p>
            <h3 className="mt-2 text-2xl font-bold text-white">{item.assets?.name ?? 'Unknown Asset'}</h3>
            <p className="mt-1 text-sm text-gray-400">
              {item.profiles?.full_name ?? 'Unknown user'} · {item.profiles?.student_id ?? 'No student ID'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 overflow-y-auto px-6 py-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Case Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as CompensationStatus)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-[#111111]">
                      {getStatusMeta(option).label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Due Date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Assessed Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={assessedAmount}
                  onChange={(event) => setAssessedAmount(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Signed / Agreed Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={agreedAmount}
                  onChange={(event) => setAgreedAmount(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Payment Reference</span>
              <input
                type="text"
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Admin Notes</span>
              <textarea
                rows={4}
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500 resize-none"
                placeholder="Add context for the student: appointment notes, exemptions, payment rules..."
              />
            </label>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-2 text-emerald-300">
                <Wallet className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Live Summary</span>
              </div>
              <div className="mt-4 space-y-3">
                <DetailRow label="Already Paid" value={formatMoney(item.paid_amount)} />
                <DetailRow label="Projected Outstanding" value={formatMoney(outstanding)} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-300" />
                <h4 className="text-sm font-semibold text-white">Add Payment Record</h4>
              </div>
              <div className="space-y-4">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Received Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                    placeholder="0.00"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Method</span>
                  <input
                    type="text"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Receipt / Transfer Ref</span>
                  <input
                    type="text"
                    value={paymentRecordReference}
                    onChange={(event) => setPaymentRecordReference(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Payment Note</span>
                  <textarea
                    rows={3}
                    value={paymentNote}
                    onChange={(event) => setPaymentNote(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500 resize-none"
                    placeholder="Optional note for this payment entry..."
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/5 px-6 py-5">
          <p className="text-sm text-gray-500">
            Saving will update the debt status, refresh the payment progress, and notify the student.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave({
                caseId: item.id,
                status,
                assessedAmount: assessedAmount ? Number(assessedAmount) : null,
                agreedAmount: agreedAmount ? Number(agreedAmount) : null,
                dueDate: dueDate ? new Date(`${dueDate}T12:00:00Z`).toISOString() : null,
                paymentReference,
                adminNotes,
                paymentAmount: paymentAmount ? Number(paymentAmount) : 0,
                paymentMethod,
                paymentRecordReference,
                paymentNote,
              })}
              className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_16px_rgba(139,92,246,0.28)] hover:bg-violet-500"
            >
              Save Compensation Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompensationTable({
  cases,
  onUpdateCase,
  emptyTitle = 'No compensation cases yet',
  emptyMessage = 'Once a damage report requires financial follow-up, the case will appear here with amounts, payment status, and student-facing instructions.',
}: CompensationTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingCase, setEditingCase] = useState<CompensationCaseWithDetails | null>(null);

  if (cases.length === 0) {
    return (
      <div className="rounded-3xl border border-white/5 bg-gray-900/40 px-6 py-20 text-center backdrop-blur-sm">
        <p className="text-lg font-semibold text-white">{emptyTitle}</p>
        <p className="mt-2 text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-gray-900/40 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/5">
              <tr>
                <th className="w-8 py-4 pl-4" />
                <th className="py-4 pr-3 text-left text-xs font-bold uppercase tracking-[0.24em] text-gray-500">Asset</th>
                <th className="px-3 py-4 text-left text-xs font-bold uppercase tracking-[0.24em] text-gray-500">Liable User</th>
                <th className="px-3 py-4 text-left text-xs font-bold uppercase tracking-[0.24em] text-gray-500">Damage</th>
                <th className="px-3 py-4 text-left text-xs font-bold uppercase tracking-[0.24em] text-gray-500">Financials</th>
                <th className="px-3 py-4 text-left text-xs font-bold uppercase tracking-[0.24em] text-gray-500">Status</th>
                <th className="px-3 py-4 text-left text-xs font-bold uppercase tracking-[0.24em] text-gray-500">Updated</th>
                <th className="py-4 pl-3 pr-6 text-right text-xs font-bold uppercase tracking-[0.24em] text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cases.map((item) => {
                const outstanding = getOutstandingAmount(item.agreed_amount, item.assessed_amount, item.paid_amount);
                const isExpanded = expandedId === item.id;
                const isCompleted = item.status === 'paid' || item.status === 'waived' || outstanding <= 0;

                return (
                  <Fragment key={item.id}>
                    <tr
                      className="cursor-pointer transition-colors hover:bg-white/[0.04]"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <td className="py-4 pl-4 text-gray-500">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="py-4 pr-3">
                        <div className="flex items-center gap-3">
                          {item.assets?.images?.[0] ? (
                            <Image
                              src={item.assets.images[0]}
                              alt=""
                              width={44}
                              height={44}
                              unoptimized
                              className="h-11 w-11 rounded-xl border border-white/10 object-cover"
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-xl border border-white/10 bg-white/5" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-white">{item.assets?.name ?? 'Unknown asset'}</p>
                            <p className="text-xs text-gray-500">{item.payment_reference || 'Reference pending'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <p className="text-sm font-medium text-gray-200">{item.profiles?.full_name ?? 'Unknown'}</p>
                        <p className="mt-1 text-xs font-mono text-gray-500">{item.profiles?.student_id ?? 'No student ID'}</p>
                      </td>
                      <td className="px-3 py-4">
                        <p className="text-sm text-gray-200 capitalize">{item.damage_reports?.severity ?? '—'}</p>
                        <p className="mt-1 text-xs text-gray-500 capitalize">{item.damage_reports?.status ?? '—'}</p>
                      </td>
                      <td className="px-3 py-4">
                        <p className="text-sm font-semibold text-white">{formatMoney(item.agreed_amount ?? item.assessed_amount)}</p>
                        <p className="mt-1 text-xs text-rose-300">Outstanding {formatMoney(outstanding)}</p>
                      </td>
                      <td className="px-3 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-3 py-4">
                        <p className="text-sm text-gray-200">{formatDateTime(item.updated_at)}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.due_date ? `Due ${formatDateTime(item.due_date)}` : 'No due date'}
                        </p>
                      </td>
                      <td className="py-4 pl-3 pr-6 text-right">
                        {isCompleted ? (
                          <span className="inline-flex items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                            Completed
                          </span>
                        ) : (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingCase(item);
                            }}
                            className="inline-flex items-center rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/15"
                          >
                            Manage
                          </button>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <ExpandedDetail item={item} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingCase && (
        <UpdateModal
          item={editingCase}
          onClose={() => setEditingCase(null)}
          onSave={async (input) => {
            await onUpdateCase(input);
            setEditingCase(null);
          }}
        />
      )}
    </>
  );
}
