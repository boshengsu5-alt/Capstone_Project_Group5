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

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getSeverityLabel(t: TranslateFn, severity?: string): string {
  if (!hasText(severity)) return t('notifications.damageSeverity.unknown');

  const key = `notifications.damageSeverity.${severity}`;
  const label = t(key);
  return label && label !== key ? label : severity;
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
