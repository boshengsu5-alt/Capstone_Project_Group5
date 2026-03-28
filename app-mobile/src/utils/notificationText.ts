import type { Notification } from '../../../database/types/supabase';

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

  const tTitle = t(`notifications.types.${notification.type}.title`);
  const tMessage = t(`notifications.types.${notification.type}.message`);

  if (tTitle && tTitle !== `notifications.types.${notification.type}.title`) {
    return { title: tTitle, message: tMessage };
  }

  return { title: notification.title, message: notification.message };
}
