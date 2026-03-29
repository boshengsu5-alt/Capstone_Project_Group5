import type { Notification } from '../../../database/types/supabase';
import i18n from '../i18n';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type DamageNotificationMetadata = {
  stage?: string;
  asset_name?: string;
  severity?: string;
  credit_delta?: number;
  return_bonus_delta?: number;
  total_credit_delta?: number;
  return_bonus_revoked?: boolean;
  compensation?: number | null;
};

type CompensationNotificationMetadata = {
  stage?: string;
  status?: string;
  asset_name?: string;
  assessed_amount?: number | string | null;
  agreed_amount?: number | string | null;
  paid_amount?: number | string | null;
  outstanding_amount?: number | string | null;
  due_date?: string | null;
  payment_reference?: string | null;
  payment_amount?: number | string | null;
};

type OverdueNotificationMetadata = {
  asset_name?: string;
  overdue_days?: number;
  days_overdue?: number;
  penalty?: number;
  credit_delta?: number;
  /** 'day1' | 'day7' | 'day30' — checkpoint node that triggered this notification */
  checkpoint?: string;
};

export type OverdueNotificationDetails = {
  assetName?: string;
  overdueDays?: number;
  deductedPoints?: number;
};

export type CompensationNotificationDetails = {
  stage?: string;
  status?: string;
  assetName?: string;
  assessedAmount?: number;
  agreedAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  dueDate?: string;
  paymentReference?: string;
  paymentAmount?: number;
};

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function getSeverityLabel(t: TranslateFn, severity?: string): string {
  if (!hasText(severity)) return t('notifications.damageSeverity.unknown');

  const key = `notifications.damageSeverity.${severity}`;
  const label = t(key);
  return label && label !== key ? label : severity;
}

function formatAmount(value: number): string {
  return `¥${value.toLocaleString()}`;
}

function getCompensationStatusLabel(t: TranslateFn, status?: string): string | undefined {
  if (!hasText(status)) return undefined;

  const key = `compensation.status.${status}`;
  const label = t(key);
  return label && label !== key ? label : status;
}

export function getOverdueNotificationDetails(
  notification: Pick<Notification, 'metadata'>
): OverdueNotificationDetails | null {
  const metadata = (notification.metadata ?? {}) as OverdueNotificationMetadata;
  const assetName = hasText(metadata.asset_name) ? metadata.asset_name : undefined;
  const overdueDays = getFiniteNumber(metadata.overdue_days) ?? getFiniteNumber(metadata.days_overdue);
  const penalty = getFiniteNumber(metadata.penalty);
  const creditDelta = getFiniteNumber(metadata.credit_delta);
  const deductedPoints = penalty ?? (typeof creditDelta === 'number' ? Math.abs(creditDelta) : undefined);

  if (!assetName && typeof overdueDays !== 'number' && typeof deductedPoints !== 'number') {
    return null;
  }

  return {
    assetName,
    overdueDays,
    deductedPoints,
  };
}

export function getCompensationNotificationDetails(
  notification: Pick<Notification, 'metadata'>
): CompensationNotificationDetails | null {
  const metadata = (notification.metadata ?? {}) as CompensationNotificationMetadata;

  const details: CompensationNotificationDetails = {
    stage: hasText(metadata.stage) ? metadata.stage : undefined,
    status: hasText(metadata.status) ? metadata.status : undefined,
    assetName: hasText(metadata.asset_name) ? metadata.asset_name : undefined,
    assessedAmount: getFiniteNumber(metadata.assessed_amount),
    agreedAmount: getFiniteNumber(metadata.agreed_amount),
    paidAmount: getFiniteNumber(metadata.paid_amount),
    outstandingAmount: getFiniteNumber(metadata.outstanding_amount),
    dueDate: hasText(metadata.due_date) ? metadata.due_date : undefined,
    paymentReference: hasText(metadata.payment_reference) ? metadata.payment_reference : undefined,
    paymentAmount: getFiniteNumber(metadata.payment_amount),
  };

  const hasUsefulData = Object.values(details).some((value) => value != null);
  return hasUsefulData ? details : null;
}

function getOverdueNotificationText(
  t: TranslateFn,
  notification: Pick<Notification, 'title' | 'message' | 'metadata'>
) {
  const details = getOverdueNotificationDetails(notification);
  if (!details) return null;

  const metadata = (notification.metadata ?? {}) as OverdueNotificationMetadata;
  // Day 30 checkpoint: device auto-classified as lost — show distinct title/message
  const isLostCheckpoint = metadata.checkpoint === 'day30';

  const lines: string[] = [];

  if (details.assetName) {
    lines.push(t('notifications.dynamic.overdueAlert.assetLine', {
      asset: details.assetName,
    }));
  }

  if (typeof details.overdueDays === 'number') {
    lines.push(t('notifications.dynamic.overdueAlert.daysLine', {
      days: details.overdueDays,
    }));
  }

  if (typeof details.deductedPoints === 'number') {
    lines.push(t('notifications.dynamic.overdueAlert.creditPenaltyLine', {
      points: details.deductedPoints,
    }));
  }

  if (isLostCheckpoint) {
    lines.push(t('notifications.dynamic.overdueAlert.lostReminder'));
  } else {
    lines.push(t('notifications.dynamic.overdueAlert.reminder'));
  }

  return {
    title: isLostCheckpoint
      ? t('notifications.dynamic.overdueAlert.lostTitle')
      : t('notifications.dynamic.overdueAlert.title'),
    message: lines.join('\n'),
  };
}

function getDamageNotificationText(
  t: TranslateFn,
  notification: Pick<Notification, 'title' | 'message' | 'metadata'>
) {
  const metadata = (notification.metadata ?? {}) as DamageNotificationMetadata;
  if (!hasText(metadata.asset_name) || !hasText(metadata.stage)) return null;

  const severityLabel = getSeverityLabel(t, metadata.severity);

  if (metadata.stage === 'reported') {
    return {
      title: t('notifications.dynamic.damageReported.reported.title'),
      message: t('notifications.dynamic.damageReported.reported.message', {
        asset: metadata.asset_name,
        severity: severityLabel,
      }),
    };
  }

  if (metadata.stage === 'investigating') {
    return {
      title: t('notifications.dynamic.damageReported.investigating.title'),
      message: t('notifications.dynamic.damageReported.investigating.message', {
        asset: metadata.asset_name,
      }),
    };
  }

  if (metadata.stage === 'dismissed') {
    return {
      title: t('notifications.dynamic.damageReported.dismissed.title'),
      message: t('notifications.dynamic.damageReported.dismissed.message', {
        asset: metadata.asset_name,
      }),
    };
  }

  if (metadata.stage === 'resolved' && typeof metadata.credit_delta === 'number') {
    const lines = [
      t('notifications.dynamic.damageReported.resolved.base', {
        asset: metadata.asset_name,
        severity: severityLabel,
      }),
      t('notifications.dynamic.damageReported.resolved.damagePenalty', {
        points: Math.abs(metadata.credit_delta),
      }),
    ];

    if (metadata.return_bonus_revoked && typeof metadata.return_bonus_delta === 'number' && metadata.return_bonus_delta < 0) {
      lines.push(t('notifications.dynamic.damageReported.resolved.returnBonusRevoked', {
        points: Math.abs(metadata.return_bonus_delta),
      }));
    }

    if (typeof metadata.total_credit_delta === 'number' && metadata.total_credit_delta < 0) {
      lines.push(t('notifications.dynamic.damageReported.resolved.totalCreditImpact', {
        points: Math.abs(metadata.total_credit_delta),
      }));
    }

    if (typeof metadata.compensation === 'number' && metadata.compensation > 0) {
      lines.push(t('notifications.dynamic.damageReported.resolved.compensation', {
        amount: metadata.compensation.toLocaleString(),
      }));
    }

    return {
      title: t('notifications.dynamic.damageReported.resolved.title'),
      message: lines.join('\n'),
    };
  }

  return null;
}

function getCompensationNotificationText(
  t: TranslateFn,
  notification: Pick<Notification, 'title' | 'message' | 'metadata'>
) {
  const details = getCompensationNotificationDetails(notification);
  if (!details) return null;

  const lines: string[] = [];
  const stage = details.stage ?? details.status;
  const statusLabel = getCompensationStatusLabel(t, details.status);

  if (details.assetName) {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.assetLine', {
      asset: details.assetName,
    }));
  }

  if (statusLabel) {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.statusLine', {
      status: statusLabel,
    }));
  }

  if (typeof details.assessedAmount === 'number') {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.assessedLine', {
      amount: formatAmount(details.assessedAmount),
    }));
  }

  if (typeof details.agreedAmount === 'number') {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.agreedLine', {
      amount: formatAmount(details.agreedAmount),
    }));
  }

  if (typeof details.paymentAmount === 'number' && details.paymentAmount > 0) {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.paymentLine', {
      amount: formatAmount(details.paymentAmount),
    }));
  }

  if (typeof details.paidAmount === 'number') {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.paidLine', {
      amount: formatAmount(details.paidAmount),
    }));
  }

  if (typeof details.outstandingAmount === 'number') {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.outstandingLine', {
      amount: formatAmount(details.outstandingAmount),
    }));
  }

  if (details.dueDate) {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.dueDateLine', {
      date: new Date(details.dueDate).toLocaleDateString(i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'),
    }));
  }

  if (details.paymentReference) {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.referenceLine', {
      reference: details.paymentReference,
    }));
  }

  switch (stage) {
    case 'under_review':
      return {
        title: t('notifications.dynamic.compensationUpdate.underReview.title'),
        message: [...lines, t('notifications.dynamic.compensationUpdate.underReview.message')].join('\n'),
      };
    case 'awaiting_signature':
      return {
        title: t('notifications.dynamic.compensationUpdate.awaitingSignature.title'),
        message: [...lines, t('notifications.dynamic.compensationUpdate.awaitingSignature.message')].join('\n'),
      };
    case 'awaiting_payment':
      return {
        title: t('notifications.dynamic.compensationUpdate.awaitingPayment.title'),
        message: [...lines, t('notifications.dynamic.compensationUpdate.awaitingPayment.message')].join('\n'),
      };
    case 'partially_paid':
      return {
        title: t('notifications.dynamic.compensationUpdate.partiallyPaid.title'),
        message: [...lines, t('notifications.dynamic.compensationUpdate.partiallyPaid.message')].join('\n'),
      };
    case 'paid':
      return {
        title: t('notifications.dynamic.compensationUpdate.paid.title'),
        message: [...lines, t('notifications.dynamic.compensationUpdate.paid.message')].join('\n'),
      };
    case 'waived':
      return {
        title: t('notifications.dynamic.compensationUpdate.waived.title'),
        message: [...lines, t('notifications.dynamic.compensationUpdate.waived.message')].join('\n'),
      };
    case 'payment_recorded':
      return {
        title: t('notifications.dynamic.compensationUpdate.paymentRecorded.title'),
        message: [...lines, t('notifications.dynamic.compensationUpdate.paymentRecorded.message')].join('\n'),
      };
    default:
      if (hasText(notification.title) && hasText(notification.message)) {
        return { title: notification.title, message: notification.message };
      }
      return null;
  }
}

export function getNotificationText(
  t: TranslateFn,
  notification: Pick<Notification, 'type' | 'title' | 'message' | 'metadata'>
) {
  if (notification.type === 'overdue_alert') {
    const overdueText = getOverdueNotificationText(t, notification);
    if (overdueText) return overdueText;

    if (hasText(notification.title) && hasText(notification.message)) {
      return { title: notification.title, message: notification.message };
    }
  }

  if (notification.type === 'damage_reported') {
    const damageText = getDamageNotificationText(t, notification);
    if (damageText) return damageText;

    if (hasText(notification.title) && hasText(notification.message)) {
      return { title: notification.title, message: notification.message };
    }
  }

  if (notification.type === 'compensation_update') {
    const compensationText = getCompensationNotificationText(t, notification);
    if (compensationText) return compensationText;

    if (hasText(notification.title) && hasText(notification.message)) {
      return { title: notification.title, message: notification.message };
    }
  }

  const tTitle = t(`notifications.types.${notification.type}.title`);
  const tMessage = t(`notifications.types.${notification.type}.message`);

  if (tTitle && tTitle !== `notifications.types.${notification.type}.title`) {
    return { title: tTitle, message: tMessage };
  }

  return { title: notification.title, message: notification.message };
}
