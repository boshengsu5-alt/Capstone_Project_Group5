import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { ProfileStackParamList } from '../../navigation/ProfileStackNavigator';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';
import type { NotificationType } from '../../../../database/types/supabase';
import {
  getCompensationNotificationDetails,
  getNotificationText,
  getOverdueNotificationDetails,
} from '../../utils/notificationText';

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  booking_approved: { icon: 'checkmark-circle', color: '#10b981' },
  booking_rejected: { icon: 'close-circle', color: theme.colors.danger },
  booking_pending: { icon: 'hourglass-outline', color: '#3b82f6' },
  booking_suspended: { icon: 'pause-circle-outline', color: '#f59e0b' },
  booking_restored: { icon: 'refresh-circle-outline', color: '#14b8a6' },
  booking_cancelled: { icon: 'close-circle-outline', color: '#f97316' },
  return_submitted: { icon: 'checkmark-done-circle-outline', color: '#0ea5e9' },
  return_reminder: { icon: 'time', color: '#f59e0b' },
  overdue_alert: { icon: 'alert-circle', color: theme.colors.danger },
  damage_reported: { icon: 'warning', color: '#f97316' },
  compensation_update: { icon: 'receipt-outline', color: '#8b5cf6' },
  review_reply: { icon: 'chatbubbles', color: '#8b5cf6' },
  system: { icon: 'information-circle', color: theme.colors.primary },
};

function formatFullTime(dateStr: string, language: string): string {
  return new Date(dateStr).toLocaleString(language?.startsWith('zh') ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(amount?: number) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
  return `¥${amount.toLocaleString()}`;
}

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'NotificationDetail'>;
  route: RouteProp<ProfileStackParamList, 'NotificationDetail'>;
};

export default function NotificationDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { notification } = route.params;
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system;
  const { title, message } = getNotificationText(t, notification);
  const overdueDetails = notification.type === 'overdue_alert'
    ? getOverdueNotificationDetails(notification)
    : null;
  const compensationDetails = notification.type === 'compensation_update'
    ? getCompensationNotificationDetails(notification)
    : null;
  const compensationStatus = compensationDetails?.status
    ? (() => {
        const key = `compensation.status.${compensationDetails.status}`;
        const label = t(key);
        return label !== key ? label : compensationDetails.status;
      })()
    : '—';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 图标区域 */}
        <View style={[styles.iconWrap, { backgroundColor: config.color + '18' }]}>
          <Ionicons name={config.icon as any} size={40} color={config.color} />
        </View>

        {/* 类型标签 */}
        <View style={[styles.typeBadge, { backgroundColor: config.color + '20' }]}>
          <Text style={[styles.typeText, { color: config.color }]}>{title}</Text>
        </View>

        {/* 标题 */}
        <Text style={styles.title}>{title}</Text>

        {/* 时间 */}
        <Text style={styles.time}>{formatFullTime(notification.created_at, i18n.language)}</Text>

        {/* 分割线 */}
        <View style={styles.divider} />

        {overdueDetails ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>{t('notifications.detail.overdueSection')}</Text>

            {overdueDetails.assetName ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('notifications.detail.asset')}</Text>
                <Text style={styles.detailValue}>{overdueDetails.assetName}</Text>
              </View>
            ) : null}

            {typeof overdueDetails.overdueDays === 'number' ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('notifications.detail.overdueDays')}</Text>
                <Text style={styles.detailValue}>
                  {t('notifications.detail.daysValue', { days: overdueDetails.overdueDays })}
                </Text>
              </View>
            ) : null}

            {typeof overdueDetails.deductedPoints === 'number' ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('notifications.detail.creditImpact')}</Text>
                <Text style={[styles.detailValue, styles.detailDanger]}>
                  {t('notifications.detail.creditDeductionValue', {
                    points: overdueDetails.deductedPoints,
                  })}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {compensationDetails ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>{t('notifications.detail.compensationSection')}</Text>

            {compensationDetails.assetName ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('notifications.detail.asset')}</Text>
                <Text style={styles.detailValue}>{compensationDetails.assetName}</Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('notifications.detail.caseStatus')}</Text>
              <Text style={styles.detailValue}>{compensationStatus}</Text>
            </View>

            {typeof compensationDetails.assessedAmount === 'number' ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('notifications.detail.assessedAmount')}</Text>
                <Text style={styles.detailValue}>{formatMoney(compensationDetails.assessedAmount)}</Text>
              </View>
            ) : null}

            {typeof compensationDetails.agreedAmount === 'number' ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('notifications.detail.agreedAmount')}</Text>
                <Text style={styles.detailValue}>{formatMoney(compensationDetails.agreedAmount)}</Text>
              </View>
            ) : null}

            {typeof compensationDetails.paymentAmount === 'number' ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('notifications.detail.paymentAmount')}</Text>
                <Text style={[styles.detailValue, { color: theme.colors.primary }]}>
                  {formatMoney(compensationDetails.paymentAmount)}
                </Text>
              </View>
            ) : null}

            {typeof compensationDetails.paidAmount === 'number' ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('notifications.detail.paidAmount')}</Text>
                <Text style={[styles.detailValue, { color: theme.colors.success }]}>
                  {formatMoney(compensationDetails.paidAmount)}
                </Text>
              </View>
            ) : null}

            {typeof compensationDetails.outstandingAmount === 'number' ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('notifications.detail.outstandingAmount')}</Text>
                <Text style={[
                  styles.detailValue,
                  compensationDetails.outstandingAmount > 0 ? styles.detailDanger : styles.detailSuccess,
                ]}>
                  {formatMoney(compensationDetails.outstandingAmount)}
                </Text>
              </View>
            ) : null}

            {compensationDetails.dueDate ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('notifications.detail.dueDate')}</Text>
                <Text style={styles.detailValue}>{formatFullTime(compensationDetails.dueDate, i18n.language)}</Text>
              </View>
            ) : null}

            {compensationDetails.paymentReference ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('notifications.detail.paymentReference')}</Text>
                <Text style={styles.detailValue}>{compensationDetails.paymentReference}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 消息正文 */}
        <Text style={styles.message}>{message}</Text>
      </ScrollView>

      {/* 返回按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>{t('notifications.back')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xl + 8,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  typeBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: theme.spacing.md,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  time: {
    fontSize: 13,
    color: theme.colors.gray,
    marginBottom: theme.spacing.lg,
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginBottom: theme.spacing.lg,
  },
  detailCard: {
    width: '100%',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  detailCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: theme.spacing.md,
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.gray,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'right',
    lineHeight: 20,
  },
  detailDanger: {
    color: theme.colors.danger,
  },
  detailSuccess: {
    color: theme.colors.success,
  },
  message: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 24,
    textAlign: 'left',
    width: '100%',
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  backBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
