import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { alertManager } from '../../utils/alertManager';
import { useNavigation, NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { getMyBookings, cancelBooking, getReviewByBookingId, type MyCompensationCaseSummary } from '../../services/bookingService';
import { checkAndSendReturnReminders, checkExpiredPendingBookings } from '../../services/notificationService';
import { supabase } from '../../services/supabase';
import type { Booking, Asset, BookingStatus, CompensationStatus } from '../../../../database/types/supabase';
import SafeImage from '../../components/SafeImage';
import ReviewModal from '../../components/ReviewModal';
import ReviewCard, { ReviewWithMeta } from '../../components/ReviewCard';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { handleApiError } from '../../utils/errorHandler';
import { formatDateTime } from '../../utils/dateTime';
import { getOutstandingAmount } from '../../utils/compensation';
import { useTranslation } from 'react-i18next';

type BookingWithAsset = Booking & {
  assets: Pick<Asset, 'name' | 'images'> | null;
  damage_reports: Array<{ id: string; status: string; severity: string }> | null;
  compensation_cases: MyCompensationCaseSummary[] | null;
};

const getStatusLabel = (status: BookingStatus, t: any) => {
  switch (status) {
    case 'returned': return t('bookings.status.returned');
    case 'active': return t('bookings.status.active');
    case 'overdue': return t('bookings.status.overdue');
    case 'lost_reported': return t('bookings.status.lost_reported');
    case 'lost': return t('bookings.status.lost');
    case 'pending': return t('bookings.status.pending');
    case 'approved': return t('bookings.status.approved');
    case 'rejected': return t('bookings.status.rejected');
    case 'cancelled': return t('bookings.status.cancelled');
    case 'suspended': return t('bookings.status.suspended');
    default: return status;
  }
};

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case 'overdue': return theme.colors.danger;
    case 'active': return theme.colors.amber;
    case 'lost_reported': return '#EA580C';
    case 'lost': return theme.colors.danger;
    case 'returned': return theme.colors.success;
    case 'approved': return theme.colors.authPrimary;
    case 'pending': return theme.colors.gray;
    case 'suspended': return theme.colors.amber;
    default: return theme.colors.gray;
  }
};

const isCompensationCompleted = (status: CompensationStatus) => status === 'paid' || status === 'waived';

const getCompensationStatusMeta = (completed: boolean) => {
  if (completed) {
    return { text: '#15803D', background: '#DCFCE7' };
  }

  return { text: '#B45309', background: '#FEF3C7' };
};


export default function BookingHistoryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [bookings, setBookings] = useState<BookingWithAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 评价弹窗状态
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<{ id: string; name: string } | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  // 各 bookingId 对应的评价（已归还的借用）
  const [reviewsMap, setReviewsMap] = useState<Record<string, ReviewWithMeta | null>>({});

  const fetchBookings = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      // 先自动取消过期的 pending 预约，再拉数据，确保列表状态是最新的
      await checkExpiredPendingBookings().catch(() => {});

      const [data, { data: { user } }] = await Promise.all([
        getMyBookings(),
        supabase.auth.getUser(),
      ]);
      setCurrentUserId(user?.id);
      setBookings(data as BookingWithAsset[]);
      // 并发拉取所有「已归还」借用的评价
      const returnedItems = (data as BookingWithAsset[]).filter(b => b.status === 'returned');
      const reviewEntries = await Promise.all(
        returnedItems.map(async b => {
          const review = await getReviewByBookingId(b.id).catch(() => null);
          // 加上 reviewer_name = '我' 方便 ReviewCard 组件显示
          const withMeta = review
            ? ({ ...review, reviewer_name: t('reviewCard.me') } as ReviewWithMeta)
            : null;
          return [b.id, withMeta] as [string, ReviewWithMeta | null];
        })
      );
      setReviewsMap(Object.fromEntries(reviewEntries));
    } catch (error) {
      alertManager.alert(t('bookings.loadFailed'), t('bookings.loadFailedMessage'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    // 静默检查快到期的借用并发提醒（fire-and-forget）
    checkAndSendReturnReminders().catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(true);
  };

  const handleCancel = (bookingId: string, assetName: string) => {
    alertManager.alert(t('bookings.cancelConfirm'), t('bookings.cancelConfirmMessage', { asset: assetName }), [
      { text: t('bookings.thinkAgain'), style: 'cancel' },
      {
        text: t('bookings.confirmCancel'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(bookingId);
            alertManager.alert(t('bookings.cancelSuccess'), t('bookings.cancelSuccessMessage'));
            fetchBookings();
          } catch (err: unknown) {
            handleApiError(err, t('bookings.cancelFailed'));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: BookingWithAsset }) => {
    const asset = item.assets;
    const statusColor = getStatusColor(item.status);
    const imageUrl = asset?.images?.[0];
    const assetName = asset?.name || t('bookings.unknownDevice');

    const canReturn = item.status === 'active' || item.status === 'overdue';
    const canPickUp = item.status === 'approved';
    const isLostReported = item.status === 'lost_reported';
    const isLostFinal = item.status === 'lost';
    // suspended 状态允许用户主动取消，不想等设备修好可直接放弃
    const canCancel = item.status === 'pending' || item.status === 'approved' || item.status === 'suspended';
    const isReturned = item.status === 'returned';
    const ownDamageReport =
      item.damage_reports?.find((report) => report.status === 'open' || report.status === 'investigating')
      ?? item.damage_reports?.[0]
      ?? null;
    const hasOpenDamageReport = (item.damage_reports?.some((report) => report.status === 'open' || report.status === 'investigating') ?? false);
    const hasNonDismissedDamageReport = (item.damage_reports?.some((report) => report.status !== 'dismissed') ?? false);
    const compensationCase = [...(item.compensation_cases ?? [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
    const compensationCompleted = compensationCase ? isCompensationCompleted(compensationCase.status) : false;
    const canEditDamage =
      (canReturn || isReturned || isLostReported) &&
      !compensationCompleted &&
      !!ownDamageReport &&
      (ownDamageReport.status === 'open' || ownDamageReport.status === 'investigating');
    const canCreateDamage = canReturn && !hasOpenDamageReport;
    const existingReview = isReturned ? reviewsMap[item.id] : undefined;
    const hasReview = !!existingReview;
    const compensationOutstanding = compensationCase
      ? getOutstandingAmount(
          compensationCase.agreed_amount,
          compensationCase.assessed_amount,
          compensationCase.paid_amount
        )
      : 0;
    const compensationMeta = compensationCase ? getCompensationStatusMeta(compensationCompleted) : null;
    const compensationStatusLabel = compensationCase
      ? compensationCompleted
        ? t('bookings.compensationCompletedStatus')
        : t('bookings.compensationWaitingStatus')
      : '';
    const compensationSummary = compensationCase
      ? compensationCompleted
        ? t('bookings.compensationSettled')
        : compensationOutstanding > 0
        ? t('bookings.compensationOutstanding', { amount: compensationOutstanding.toLocaleString() })
        : t('bookings.compensationInProgress')
      : '';
    const lostNoticeColors = isLostFinal
      ? { background: '#FEF2F2', border: '#FECACA', icon: theme.colors.danger, title: theme.colors.danger }
      : { background: '#FFF7ED', border: '#FED7AA', icon: '#EA580C', title: '#C2410C' };

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <SafeImage
            uri={imageUrl}
            style={styles.assetImage}
            placeholderSize={30}
          />
          <View style={styles.infoContainer}>
            <View style={styles.cardHeader}>
              <Text style={styles.itemName} numberOfLines={1}>{assetName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                <Text style={[styles.status, { color: statusColor }]}>{getStatusLabel(item.status, t)}</Text>
              </View>
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>{t('bookings.period')}</Text>
              <Text style={styles.dateRange}>
                {formatDateTime(item.start_date)}
              </Text>
              <Text style={styles.dateRangeSub}>
                {t('bookings.to')} {formatDateTime(item.end_date)}
              </Text>
            </View>
          </View>
        </View>

        {/* 已有评价：用 ReviewCard 展示（含追问/回复） */}
        {isReturned && hasReview && existingReview && (
          <ReviewCard
            review={existingReview}
            currentUserId={currentUserId}
          />
        )}

        {compensationCase && compensationMeta && hasNonDismissedDamageReport && (
          <TouchableOpacity
            style={styles.compensationLinkCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Compensation', {
              focusCaseId: compensationCase.id,
              focusBookingId: item.id,
            })}
          >
            <View style={styles.compensationLinkLeft}>
              <View style={styles.compensationIconWrap}>
                <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.compensationTextWrap}>
                <Text style={styles.compensationLabel}>{t('bookings.compensationStatus')}</Text>
                <Text style={styles.compensationHint}>{compensationSummary}</Text>
              </View>
            </View>

            <View style={styles.compensationLinkRight}>
              <View style={[styles.compensationBadge, { backgroundColor: compensationMeta.background }]}>
                <Text style={[styles.compensationBadgeText, { color: compensationMeta.text }]}>
                  {compensationStatusLabel}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.gray} />
            </View>
          </TouchableOpacity>
        )}

        {(isLostReported || isLostFinal) && (
          <View
            style={[
              styles.lostFlowNotice,
              {
                backgroundColor: lostNoticeColors.background,
                borderColor: lostNoticeColors.border,
              },
            ]}
          >
            <Ionicons
              name={isLostFinal ? 'close-circle-outline' : 'alert-circle-outline'}
              size={18}
              color={lostNoticeColors.icon}
            />
            <View style={styles.lostFlowNoticeTextWrap}>
              <Text style={[styles.lostFlowNoticeTitle, { color: lostNoticeColors.title }]}>
                {isLostFinal ? t('bookings.lostFinalTitle') : t('bookings.lostReportedTitle')}
              </Text>
              <Text style={styles.lostFlowNoticeBody}>
                {isLostFinal ? t('bookings.lostFinalHint') : t('bookings.lostReportedHint')}
              </Text>
            </View>
          </View>
        )}

        {/* 操作按钮区域 */}
        {(canReturn || canPickUp || canCancel || isReturned || canEditDamage) && (
          <View style={styles.actionRow}>
            {canPickUp && (
              <TouchableOpacity
                style={styles.actionBtnPickUp}
                onPress={() => navigation.navigate('ScanTab')}
              >
                <Ionicons name="qr-code-outline" size={16} color="#fff" />
                <Text style={styles.actionTextPickUp}>{t('bookings.scanToPickUp')}</Text>
              </TouchableOpacity>
            )}
            {canReturn && (
              <>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('ReturnScreen', { bookingId: item.id, assetName })}
                >
                  <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.actionText}>{t('bookings.photoReturn')}</Text>
                </TouchableOpacity>
                {canCreateDamage && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnDanger]}
                    onPress={() => navigation.navigate('DamageReport', { assetId: item.asset_id, bookingId: item.id, mode: 'create' })}
                  >
                    <Ionicons name="warning-outline" size={16} color={theme.colors.danger} />
                    <Text style={[styles.actionText, { color: theme.colors.danger }]}>{t('bookings.damageReport')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            {canCancel && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => handleCancel(item.id, assetName)}
              >
                <Ionicons name="close-circle-outline" size={16} color={theme.colors.danger} />
                <Text style={[styles.actionText, { color: theme.colors.danger }]}>{t('bookings.cancelConfirm')}</Text>
              </TouchableOpacity>
            )}
            {/* 已归还：无评价 → 评价设备；有评价 → 修改评价 */}
            {isReturned && !isLostFinal && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnReview]}
                onPress={() => {
                  setSelectedBooking({ id: item.id, name: assetName });
                  setReviewModalVisible(true);
                }}
              >
                <Ionicons
                  name={hasReview ? 'create-outline' : 'star-outline'}
                  size={16}
                  color={theme.colors.warning}
                />
                <Text style={[styles.actionText, { color: theme.colors.warning }]}>
                  {hasReview ? t('bookings.editReview') : t('bookings.leaveReview')}
                </Text>
              </TouchableOpacity>
            )}
            {/* 仅在损坏报告仍处理中、且赔偿单未结清时显示编辑报修按钮 */}
            {canEditDamage && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => navigation.navigate('DamageReport', { assetId: item.asset_id, bookingId: item.id, mode: 'edit' })}
              >
                <Ionicons name="create-outline" size={16} color={theme.colors.danger} />
                <Text style={[styles.actionText, { color: theme.colors.danger }]}>{t('bookings.editDamage')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const selectedReview = selectedBooking ? (reviewsMap[selectedBooking.id] ?? null) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('bookings.title')}</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color={theme.colors.gray} style={{ marginBottom: 16, opacity: 0.5 }} />
            <Text style={styles.emptyTitle}>{t('bookings.noBookings')}</Text>
            <Text style={styles.emptySubtitle}>{t('bookings.noBookingsMessage')}</Text>
            <TouchableOpacity
              style={styles.goHomeButton}
              onPress={() => navigation.navigate('HomeTab')}
            >
              <Text style={styles.goHomeButtonText}>{t('bookings.goHome')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {selectedBooking && (
        <ReviewModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          bookingId={selectedBooking.id}
          assetName={selectedBooking.name}
          existingReview={selectedReview}
          onSuccess={() => fetchBookings()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.inputBackground,
  },
  cardContent: {
    flexDirection: 'row',
  },
  assetImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: theme.colors.inputBackground,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateRow: {
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
    lineHeight: 18,
  },
  dateRangeSub: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 2,
    lineHeight: 18,
  },
  compensationLinkCard: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  compensationLinkLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compensationIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  compensationTextWrap: {
    flex: 1,
  },
  compensationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  compensationHint: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.gray,
    lineHeight: 17,
  },
  compensationLinkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compensationBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compensationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  lostFlowNotice: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  lostFlowNoticeTextWrap: {
    flex: 1,
  },
  lostFlowNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  lostFlowNoticeBody: {
    fontSize: 12,
    color: theme.colors.gray,
    lineHeight: 18,
  },
  // ---- 操作按钮 ----
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '10',
    gap: 4,
  },
  actionBtnDanger: {
    backgroundColor: theme.colors.danger + '10',
  },
  actionBtnReview: {
    backgroundColor: theme.colors.warning + '15',
  },
  actionBtnPickUp: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    gap: 4,
  },
  actionTextPickUp: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  goHomeButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goHomeButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
