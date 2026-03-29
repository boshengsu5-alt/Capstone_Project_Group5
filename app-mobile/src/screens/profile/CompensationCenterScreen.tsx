import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { CompensationRecordType, CompensationStatus } from '../../../../database/types/supabase';
import type { CompensationSummary, MyCompensationCase } from '../../services/compensationService';
import { getMyCompensationCases, getMyCompensationSummary } from '../../services/compensationService';
import { theme } from '../../theme';
import SafeImage from '../../components/SafeImage';
import { getOutstandingAmount } from '../../utils/compensation';
import { formatDateTime } from '../../utils/dateTime';

type CompensationRouteParams = {
  focusCaseId?: string;
  focusBookingId?: string;
};

function formatMoney(amount: number | null | undefined, pendingLabel: string) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return pendingLabel;
  return `¥${amount.toLocaleString()}`;
}

function statusMeta(status: CompensationStatus) {
  switch (status) {
    case 'under_review':
      return { bg: '#E0F2FE', text: '#0369A1', icon: 'time-outline' as const };
    case 'awaiting_signature':
      return { bg: '#EDE9FE', text: '#6D28D9', icon: 'document-text-outline' as const };
    case 'awaiting_payment':
      return { bg: '#FEF3C7', text: '#B45309', icon: 'card-outline' as const };
    case 'partially_paid':
      return { bg: '#FFEDD5', text: '#C2410C', icon: 'wallet-outline' as const };
    case 'paid':
      return { bg: '#DCFCE7', text: '#15803D', icon: 'checkmark-done-outline' as const };
    case 'waived':
      return { bg: '#F3F4F6', text: '#6B7280', icon: 'shield-checkmark-outline' as const };
    default:
      return { bg: '#F3F4F6', text: '#6B7280', icon: 'information-circle-outline' as const };
  }
}

function formatRange(
  start: string | null | undefined,
  end: string | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (!start || !end) return '—';
  return `${formatDateTime(start)}\n${t('bookings.to')} ${formatDateTime(end)}`;
}

function recordTypeLabel(t: (key: string) => string, type: CompensationRecordType) {
  const key = `compensation.recordType.${type}`;
  return t(key);
}

function damageSeverityLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  severity?: string | null
) {
  if (!severity) return '—';
  const key = `compensation.damageSeverity.${severity}`;
  const label = t(key);
  return label !== key ? label : severity;
}

function damageReportStatusLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  status?: string | null
) {
  if (!status) return '—';
  const key = `compensation.damageReportStatus.${status}`;
  const label = t(key);
  return label !== key ? label : status;
}

function StepItem({
  title,
  body,
  active,
  done,
}: {
  title: string;
  body: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={[
        styles.stepDot,
        done && styles.stepDotDone,
        active && styles.stepDotActive,
      ]} />
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

function CaseCard({
  item,
  highlighted = false,
}: {
  item: MyCompensationCase;
  highlighted?: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const outstanding = useMemo(
    () => getOutstandingAmount(item.agreed_amount, item.assessed_amount, item.paid_amount),
    [item.agreed_amount, item.assessed_amount, item.paid_amount]
  );
  const settled = item.status === 'paid' || item.status === 'waived';
  const badge = statusMeta(item.status);

  const steps = [
    {
      title: t('compensation.steps.reviewTitle'),
      body: t('compensation.steps.reviewBody'),
      active: item.status === 'under_review',
      done: item.status !== 'under_review',
    },
    {
      title: t('compensation.steps.signatureTitle'),
      body: t('compensation.steps.signatureBody'),
      active: item.status === 'awaiting_signature',
      done: ['awaiting_payment', 'partially_paid', 'paid'].includes(item.status),
    },
    {
      title: t('compensation.steps.paymentTitle'),
      body: t('compensation.steps.paymentBody'),
      active: item.status === 'awaiting_payment',
      done: ['partially_paid', 'paid'].includes(item.status),
    },
    {
      title: t('compensation.steps.closureTitle'),
      body: t('compensation.steps.closureBody'),
      active: item.status === 'partially_paid',
      done: item.status === 'paid' || item.status === 'waived',
    },
  ];

  return (
    <View style={[styles.caseCard, highlighted && styles.caseCardHighlighted]}>
      <TouchableOpacity
        style={styles.caseToggleButton}
        activeOpacity={0.9}
        onPress={() => setExpanded((prev) => !prev)}
      >
        <View style={styles.caseHeader}>
          <View style={styles.caseAssetRow}>
            <SafeImage
              uri={item.assets?.images?.[0]}
              style={styles.assetThumb}
              placeholderSize={24}
            />
            <View style={styles.caseTextWrap}>
              <Text style={styles.caseTitle}>{item.assets?.name ?? t('compensation.unknownAsset')}</Text>
              <Text style={styles.caseRef}>{t('compensation.caseReference')}：{item.payment_reference || '—'}</Text>
            </View>
          </View>

          <View style={styles.caseHeaderRight}>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Ionicons name={badge.icon} size={14} color={badge.text} />
              <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                {t(`compensation.status.${item.status}`)}
              </Text>
            </View>
            <View style={styles.caseChevronWrap}>
              <Ionicons
                name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color={theme.colors.gray}
              />
            </View>
          </View>
        </View>

        <View style={styles.caseSummaryRow}>
          <View
            style={[
              styles.caseSummaryChip,
              { backgroundColor: settled ? '#ECFDF5' : outstanding > 0 ? '#FEF2F2' : '#FEF3C7' },
            ]}
          >
            <Text
              style={[
                styles.caseSummaryChipText,
                {
                  color: settled
                    ? theme.colors.success
                    : outstanding > 0
                      ? theme.colors.danger
                      : '#B45309',
                },
              ]}
            >
              {settled
                ? t('bookings.compensationSettled')
                : outstanding > 0
                ? t('bookings.compensationOutstanding', { amount: outstanding.toLocaleString() })
                : t('bookings.compensationInProgress')}
            </Text>
          </View>
          <View style={[styles.caseSummaryChip, { backgroundColor: '#F8FAFC' }]}>
            <Text style={styles.caseSummaryChipText}>
              {t('compensation.money.agreed')} {formatMoney(item.agreed_amount ?? item.assessed_amount, t('compensation.pendingAmount'))}
            </Text>
          </View>
        </View>

        <View style={styles.caseToggleHintRow}>
          <Text style={styles.caseToggleHint}>
            {expanded ? t('compensation.collapseDetails') : t('compensation.expandDetails')}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded ? (
        <>
          <View style={styles.moneyGrid}>
            <View style={[styles.moneyCard, { backgroundColor: '#FFF7ED' }]}>
              <Text style={styles.moneyLabel}>{t('compensation.money.assessed')}</Text>
              <Text style={styles.moneyValue}>{formatMoney(item.assessed_amount, t('compensation.pendingAmount'))}</Text>
            </View>
            <View style={[styles.moneyCard, { backgroundColor: '#F5F3FF' }]}>
              <Text style={styles.moneyLabel}>{t('compensation.money.agreed')}</Text>
              <Text style={styles.moneyValue}>{formatMoney(item.agreed_amount, t('compensation.pendingAmount'))}</Text>
            </View>
            <View style={[styles.moneyCard, { backgroundColor: '#ECFDF5' }]}>
              <Text style={styles.moneyLabel}>{t('compensation.money.paid')}</Text>
              <Text style={styles.moneyValue}>{formatMoney(item.paid_amount, t('compensation.pendingAmount'))}</Text>
            </View>
            <View style={[styles.moneyCard, { backgroundColor: '#FEF2F2' }]}>
              <Text style={styles.moneyLabel}>{t('compensation.money.outstanding')}</Text>
              <Text style={[styles.moneyValue, { color: outstanding > 0 ? theme.colors.danger : theme.colors.success }]}>
                {formatMoney(outstanding, t('compensation.pendingAmount'))}
              </Text>
            </View>
          </View>

          <View style={styles.infoPanel}>
            <Text style={styles.sectionTitle}>{t('compensation.guideTitle')}</Text>
            {steps.map((step) => (
              <StepItem
                key={step.title}
                title={step.title}
                body={step.body}
                active={step.active}
                done={step.done}
              />
            ))}
          </View>

          <View style={styles.infoPanel}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="call-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>{t('compensation.labels.contactPerson')}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('compensation.labels.contactPerson')}</Text>
              <Text style={styles.detailValue}>{item.contact_person}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('compensation.labels.contactEmail')}</Text>
              <Text style={styles.detailValue}>{item.contact_email}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('compensation.labels.contactPhone')}</Text>
              <Text style={styles.detailValue}>{item.contact_phone}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('compensation.labels.contactOffice')}</Text>
              <Text style={styles.detailValue}>{item.contact_office}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('compensation.labels.officeHours')}</Text>
              <Text style={styles.detailValue}>{item.office_hours}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('compensation.labels.paymentReference')}</Text>
              <Text style={styles.detailValue}>{item.payment_reference || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoPanel}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>{t('compensation.labels.damageStatus')}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('compensation.labels.liableUser')}</Text>
              <Text style={styles.detailValue}>{item.profiles?.full_name ?? '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('compensation.labels.damageSeverity')}</Text>
              <Text style={styles.detailValue}>{damageSeverityLabel(t, item.damage_reports?.severity)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('compensation.labels.damageStatus')}</Text>
              <Text style={styles.detailValue}>{damageReportStatusLabel(t, item.damage_reports?.status)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('compensation.labels.bookingPeriod')}</Text>
              <Text style={styles.detailValue}>{formatRange(item.bookings?.start_date, item.bookings?.end_date, t)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('compensation.labels.dueDate')}</Text>
              <Text style={styles.detailValue}>{item.due_date ? formatDateTime(item.due_date) : '—'}</Text>
            </View>
            {item.admin_notes ? (
              <View style={styles.noteCard}>
                <Text style={styles.noteTitle}>{t('compensation.adminNotes')}</Text>
                <Text style={styles.noteBody}>{item.admin_notes}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.infoPanel}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>{t('compensation.recordsTitle')}</Text>
            </View>
            {(item.compensation_records?.length ?? 0) === 0 ? (
              <Text style={styles.recordsEmpty}>{t('compensation.recordsEmpty')}</Text>
            ) : (
              item.compensation_records?.map((record) => (
                <View key={record.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordTitle}>{record.title}</Text>
                    <View style={styles.recordTypeBadge}>
                      <Text style={styles.recordTypeText}>{recordTypeLabel(t, record.record_type)}</Text>
                    </View>
                  </View>
                  <Text style={styles.recordTime}>{formatDateTime(record.created_at)}</Text>
                  {record.description ? <Text style={styles.recordBody}>{record.description}</Text> : null}
                  {typeof record.amount === 'number' ? (
                    <Text style={styles.recordAmount}>{formatMoney(record.amount, t('compensation.pendingAmount'))}</Text>
                  ) : null}
                  {record.payment_method ? (
                    <Text style={styles.recordMeta}>
                      {t('compensation.paymentMethod')}：{record.payment_method}
                    </Text>
                  ) : null}
                  {record.reference_no ? (
                    <Text style={styles.recordMeta}>
                      {t('compensation.referenceNo')}：{record.reference_no}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function CompensationCenterScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<Record<string, CompensationRouteParams | undefined>, string>>();
  const [cases, setCases] = useState<MyCompensationCase[]>([]);
  const [summary, setSummary] = useState<CompensationSummary>({
    totalCases: 0,
    activeCases: 0,
    totalOutstanding: 0,
    totalPaid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [caseData, summaryData] = await Promise.all([
        getMyCompensationCases(),
        getMyCompensationSummary(),
      ]);
      setCases(caseData);
      setSummary(summaryData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const focusedCaseId = useMemo(() => {
    if (route.params?.focusCaseId) return route.params.focusCaseId;
    if (route.params?.focusBookingId) {
      return cases.find((item) => item.booking_id === route.params?.focusBookingId)?.id ?? null;
    }
    return null;
  }, [cases, route.params?.focusBookingId, route.params?.focusCaseId]);

  const orderedCases = useMemo(() => {
    if (!focusedCaseId) return cases;
    const focusedCase = cases.find((item) => item.id === focusedCaseId);
    if (!focusedCase) return cases;
    return [focusedCase, ...cases.filter((item) => item.id !== focusedCaseId)];
  }, [cases, focusedCaseId]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadData(true)}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#7C3AED" />
            <Text style={styles.heroBadgeText}>{t('compensation.title')}</Text>
          </View>
          <Text style={styles.heroTitle}>{t('compensation.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('compensation.subtitle')}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#FEF2F2' }]}>
            <Text style={styles.summaryLabel}>{t('compensation.totalOutstanding')}</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>
              {formatMoney(summary.totalOutstanding, t('compensation.pendingAmount'))}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.summaryLabel}>{t('compensation.activeCases')}</Text>
            <Text style={[styles.summaryValue, { color: '#4F46E5' }]}>{summary.activeCases}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
            <Text style={styles.summaryLabel}>{t('compensation.totalPaid')}</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
              {formatMoney(summary.totalPaid, t('compensation.pendingAmount'))}
            </Text>
          </View>
        </View>

        {orderedCases.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={40} color={theme.colors.gray} />
            <Text style={styles.emptyTitle}>{t('compensation.emptyTitle')}</Text>
            <Text style={styles.emptyMessage}>{t('compensation.emptyMessage')}</Text>
          </View>
        ) : (
          <View style={styles.casesWrap}>
            {orderedCases.map((item) => (
              <CaseCard
                key={item.id}
                item={item}
                highlighted={item.id === focusedCaseId}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl + 24,
    gap: theme.spacing.md,
  },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: theme.spacing.lg,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 3,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.gray,
  },
  summaryRow: {
    gap: theme.spacing.sm,
  },
  summaryCard: {
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  casesWrap: {
    gap: theme.spacing.md,
  },
  caseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 12,
    elevation: 2,
  },
  caseCardHighlighted: {
    borderWidth: 1,
    borderColor: '#C4B5FD',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.12,
  },
  caseToggleButton: {
    gap: theme.spacing.md,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  caseAssetRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flex: 1,
  },
  caseTextWrap: {
    flex: 1,
  },
  caseHeaderRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  assetThumb: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  caseTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.colors.text,
  },
  caseRef: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.gray,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  caseChevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  caseSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  caseSummaryChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  caseSummaryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  moneyGrid: {
    gap: 10,
  },
  moneyCard: {
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  moneyLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: 6,
  },
  moneyValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  caseToggleHintRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -2,
  },
  caseToggleHint: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  infoPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: theme.spacing.md,
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
    marginTop: 6,
  },
  stepDotDone: {
    backgroundColor: theme.colors.success,
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  stepBody: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.gray,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    flex: 0.95,
  },
  detailValue: {
    flex: 1.2,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
    color: theme.colors.text,
    fontWeight: '600',
  },
  noteCard: {
    marginTop: 4,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#EEF2FF',
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 6,
  },
  noteBody: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.text,
  },
  recordsEmpty: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.gray,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  recordTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  recordTypeBadge: {
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recordTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.gray,
  },
  recordTime: {
    fontSize: 12,
    color: theme.colors.gray,
  },
  recordBody: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.text,
  },
  recordAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  recordMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.gray,
  },
});
