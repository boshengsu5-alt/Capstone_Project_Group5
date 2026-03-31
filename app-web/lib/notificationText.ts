import type { Notification } from '@/types/database';
import type { Translator } from '@/lib/i18n';
import { getCompensationStatusLabel, getDamageSeverityLabel } from '@/lib/i18n';

type NotificationLike = Pick<Notification, 'type' | 'title' | 'message' | 'metadata'>;

type DamageNotificationMetadata = {
  stage?: string;
  asset_name?: string;
  severity?: string;
  credit_delta?: number | string;
  return_bonus_delta?: number | string;
  total_credit_delta?: number | string;
  return_bonus_revoked?: boolean;
  compensation?: number | string | null;
};

type CompensationNotificationMetadata = {
  stage?: string;
  status?: string;
  asset_name?: string;
  assessed_amount?: number | string | null;
  agreed_amount?: number | string | null;
  paid_amount?: number | string | null;
  outstanding_amount?: number | string | null;
  payment_amount?: number | string | null;
};

type OverdueNotificationMetadata = {
  asset_name?: string;
  overdue_days?: number | string;
  days_overdue?: number | string;
  penalty?: number | string;
  credit_delta?: number | string;
  checkpoint?: string;
};

type ReturnReminderMetadata = {
  asset_name?: string;
  days_until_due?: number | string;
};

type ReviewReplyNotificationMetadata = {
  asset_name?: string;
  reply_author_name?: string;
  reply_author_role?: string;
  reply_preview?: string;
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

function formatAmount(value: number): string {
  return `¥${value.toLocaleString()}`;
}

function getTranslatedTypeCopy(t: Translator, type: Notification['type']) {
  const titleKey = `notifications.types.${type}.title`;
  const messageKey = `notifications.types.${type}.message`;
  const title = t(titleKey);
  const message = t(messageKey);

  if (title !== titleKey && message !== messageKey) {
    return { title, message };
  }

  return null;
}

function getReturnReminderText(t: Translator, notification: NotificationLike) {
  const metadata = (notification.metadata ?? {}) as ReturnReminderMetadata;
  const assetName = hasText(metadata.asset_name) ? metadata.asset_name : undefined;
  const daysUntilDue = getFiniteNumber(metadata.days_until_due);

  if (!assetName) return null;

  if (daysUntilDue === 0) {
    return {
      title: t('notifications.dynamic.returnReminder.todayTitle'),
      message: t('notifications.dynamic.returnReminder.todayMessage', { asset: assetName }),
    };
  }

  return {
    title: t('notifications.dynamic.returnReminder.soonTitle', { days: daysUntilDue ?? 1 }),
    message: t('notifications.dynamic.returnReminder.soonMessage', { asset: assetName, days: daysUntilDue ?? 1 }),
  };
}

function getOverdueAlertText(t: Translator, notification: NotificationLike) {
  const metadata = (notification.metadata ?? {}) as OverdueNotificationMetadata;
  const assetName = hasText(metadata.asset_name) ? metadata.asset_name : undefined;
  const overdueDays = getFiniteNumber(metadata.overdue_days) ?? getFiniteNumber(metadata.days_overdue);
  const deductedPoints = getFiniteNumber(metadata.penalty)
    ?? (() => {
      const delta = getFiniteNumber(metadata.credit_delta);
      return typeof delta === 'number' ? Math.abs(delta) : undefined;
    })();

  if (!assetName && typeof overdueDays !== 'number' && typeof deductedPoints !== 'number') return null;

  const isLostCheckpoint = metadata.checkpoint === 'day30';
  const lines: string[] = [];

  if (assetName) {
    lines.push(t('notifications.dynamic.overdueAlert.assetLine', { asset: assetName }));
  }

  if (typeof overdueDays === 'number') {
    lines.push(t('notifications.dynamic.overdueAlert.daysLine', { days: overdueDays }));
  }

  if (typeof deductedPoints === 'number') {
    lines.push(t('notifications.dynamic.overdueAlert.creditPenaltyLine', { points: deductedPoints }));
  }

  lines.push(
    isLostCheckpoint
      ? t('notifications.dynamic.overdueAlert.lostReminder')
      : t('notifications.dynamic.overdueAlert.reminder')
  );

  return {
    title: isLostCheckpoint
      ? t('notifications.dynamic.overdueAlert.lostTitle')
      : t('notifications.dynamic.overdueAlert.title'),
    message: lines.join('\n'),
  };
}

function getDamageNotificationText(t: Translator, notification: NotificationLike) {
  const metadata = (notification.metadata ?? {}) as DamageNotificationMetadata;
  if (!hasText(metadata.stage)) return null;

  const severityLabel = hasText(metadata.severity)
    ? getDamageSeverityLabel(metadata.severity, t)
    : t('notifications.damageSeverity.unknown');
  const assetName = hasText(metadata.asset_name) ? metadata.asset_name : undefined;

  if (metadata.stage === 'reported') {
    return assetName
      ? {
          title: t('notifications.dynamic.damageReported.reported.title'),
          message: t('notifications.dynamic.damageReported.reported.message', { asset: assetName, severity: severityLabel }),
        }
      : {
          title: t('notifications.dynamic.damageReported.reported.title'),
          message: t('notifications.dynamic.damageReported.reported.messageNoAsset', { severity: severityLabel }),
        };
  }

  if (metadata.stage === 'investigating' && assetName) {
    return {
      title: t('notifications.dynamic.damageReported.investigating.title'),
      message: t('notifications.dynamic.damageReported.investigating.message', { asset: assetName }),
    };
  }

  if (metadata.stage === 'dismissed' && assetName) {
    return {
      title: t('notifications.dynamic.damageReported.dismissed.title'),
      message: t('notifications.dynamic.damageReported.dismissed.message', { asset: assetName }),
    };
  }

  if (metadata.stage === 'resolved' && assetName) {
    const lines = [
      t('notifications.dynamic.damageReported.resolved.base', { asset: assetName, severity: severityLabel }),
    ];
    const damagePenalty = getFiniteNumber(metadata.credit_delta);
    const returnBonusDelta = getFiniteNumber(metadata.return_bonus_delta);
    const totalCreditDelta = getFiniteNumber(metadata.total_credit_delta);
    const compensation = getFiniteNumber(metadata.compensation);

    if (typeof damagePenalty === 'number' && damagePenalty !== 0) {
      lines.push(t('notifications.dynamic.damageReported.resolved.damagePenalty', { points: Math.abs(damagePenalty) }));
    }

    if (metadata.return_bonus_revoked && typeof returnBonusDelta === 'number' && returnBonusDelta < 0) {
      lines.push(t('notifications.dynamic.damageReported.resolved.returnBonusRevoked', { points: Math.abs(returnBonusDelta) }));
    }

    if (typeof totalCreditDelta === 'number' && totalCreditDelta < 0) {
      lines.push(t('notifications.dynamic.damageReported.resolved.totalCreditImpact', { points: Math.abs(totalCreditDelta) }));
    }

    if (typeof compensation === 'number' && compensation > 0) {
      lines.push(t('notifications.dynamic.damageReported.resolved.compensation', { amount: compensation.toLocaleString() }));
    }

    return {
      title: t('notifications.dynamic.damageReported.resolved.title'),
      message: lines.join('\n'),
    };
  }

  return null;
}

function getCompensationUpdateText(t: Translator, notification: NotificationLike) {
  const metadata = (notification.metadata ?? {}) as CompensationNotificationMetadata;
  const stage = hasText(metadata.stage) ? metadata.stage : undefined;
  const status = hasText(metadata.status) ? metadata.status : undefined;
  const assetName = hasText(metadata.asset_name) ? metadata.asset_name : undefined;

  if (!stage && !status && !assetName) return null;

  const lines: string[] = [];
  const translatedStatus = status ? getCompensationStatusLabel(status, t) : undefined;
  const assessedAmount = getFiniteNumber(metadata.assessed_amount);
  const agreedAmount = getFiniteNumber(metadata.agreed_amount);
  const paidAmount = getFiniteNumber(metadata.paid_amount);
  const outstandingAmount = getFiniteNumber(metadata.outstanding_amount);
  const paymentAmount = getFiniteNumber(metadata.payment_amount);

  if (assetName) {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.assetLine', { asset: assetName }));
  }

  if (translatedStatus) {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.statusLine', { status: translatedStatus }));
  }

  if (typeof assessedAmount === 'number') {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.assessedLine', { amount: formatAmount(assessedAmount) }));
  }

  if (typeof agreedAmount === 'number') {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.agreedLine', { amount: formatAmount(agreedAmount) }));
  }

  if (typeof paymentAmount === 'number' && paymentAmount > 0) {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.paymentLine', { amount: formatAmount(paymentAmount) }));
  }

  if (typeof paidAmount === 'number') {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.paidLine', { amount: formatAmount(paidAmount) }));
  }

  if (typeof outstandingAmount === 'number') {
    lines.push(t('notifications.dynamic.compensationUpdate.shared.outstandingLine', { amount: formatAmount(outstandingAmount) }));
  }

  const statusKeyMap: Record<string, string> = {
    under_review: 'notifications.dynamic.compensationUpdate.underReview',
    awaiting_signature: 'notifications.dynamic.compensationUpdate.awaitingSignature',
    awaiting_payment: 'notifications.dynamic.compensationUpdate.awaitingPayment',
    partially_paid: 'notifications.dynamic.compensationUpdate.partiallyPaid',
    paid: 'notifications.dynamic.compensationUpdate.paid',
    waived: 'notifications.dynamic.compensationUpdate.waived',
    payment_recorded: 'notifications.dynamic.compensationUpdate.paymentRecorded',
  };

  const copyBase = statusKeyMap[stage ?? status ?? ''];
  if (!copyBase) return null;

  return {
    title: t(`${copyBase}.title`),
    message: [t(`${copyBase}.message`), ...lines].join('\n'),
  };
}

function getReviewReplyText(t: Translator, notification: NotificationLike) {
  const metadata = (notification.metadata ?? {}) as ReviewReplyNotificationMetadata;
  const authorName = hasText(metadata.reply_author_name)
    ? metadata.reply_author_name
    : t('notifications.dynamic.reviewReply.someone');
  const assetName = hasText(metadata.asset_name) ? metadata.asset_name : undefined;
  const preview = hasText(metadata.reply_preview) ? metadata.reply_preview : undefined;
  const isAdmin = metadata.reply_author_role === 'admin';

  if (!assetName && !preview && !authorName) return null;

  const roleSuffix = isAdmin ? t('notifications.dynamic.reviewReply.adminSuffix') : '';
  const firstLine = assetName
    ? t('notifications.dynamic.reviewReply.messageWithAsset', {
        name: authorName,
        role: roleSuffix,
        asset: assetName,
      })
    : t('notifications.dynamic.reviewReply.message', {
        name: authorName,
        role: roleSuffix,
      });

  const lines = [firstLine];
  if (preview) {
    lines.push(t('notifications.dynamic.reviewReply.preview', { preview }));
  }

  return {
    title: isAdmin
      ? t('notifications.dynamic.reviewReply.adminTitle')
      : t('notifications.dynamic.reviewReply.title'),
    message: lines.join('\n'),
  };
}

export function getNotificationText(t: Translator, notification: NotificationLike) {
  if (notification.type === 'return_reminder') {
    const text = getReturnReminderText(t, notification);
    if (text) return text;
  }

  if (notification.type === 'overdue_alert') {
    const text = getOverdueAlertText(t, notification);
    if (text) return text;
  }

  if (notification.type === 'damage_reported') {
    const text = getDamageNotificationText(t, notification);
    if (text) return text;
  }

  if (notification.type === 'compensation_update') {
    const text = getCompensationUpdateText(t, notification);
    if (text) return text;
  }

  if (notification.type === 'review_reply') {
    const text = getReviewReplyText(t, notification);
    if (text) return text;
  }

  const translated = getTranslatedTypeCopy(t, notification.type);
  if (translated) return translated;

  return {
    title: notification.title,
    message: notification.message,
  };
}
