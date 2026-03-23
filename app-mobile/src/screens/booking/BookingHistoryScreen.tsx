import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { getMyBookings, cancelBooking } from '../../services/bookingService';
import type { Booking, Asset, BookingStatus } from '../../../../database/types/supabase';
import SafeImage from '../../components/SafeImage';
import ReviewModal from '../../components/ReviewModal';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { handleApiError } from '../../utils/errorHandler';

// 从 service 返回的借用记录，包含关联的资产信息
type BookingWithAsset = Booking & {
  assets: Pick<Asset, 'name' | 'images'> | null;
};

const getStatusLabel = (status: BookingStatus) => {
  switch (status) {
    case 'returned': return '已归还';
    case 'active': return '已借用';
    case 'overdue': return '已逾期';
    case 'pending': return '待审批';
    case 'approved': return '已通过';
    case 'rejected': return '已拒绝';
    case 'cancelled': return '已取消';
    default: return status;
  }
};

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case 'overdue': return theme.colors.danger;
    case 'active': return theme.colors.amber;
    case 'returned': return theme.colors.success;
    case 'approved': return theme.colors.authPrimary;
    case 'pending': return theme.colors.gray;
    default: return theme.colors.gray;
  }
};

export default function BookingHistoryScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [bookings, setBookings] = useState<BookingWithAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 评价弹窗状态
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<{id: string, name: string} | null>(null);

  const fetchBookings = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const data = await getMyBookings();
      setBookings(data as BookingWithAsset[]);
    } catch (error) {
      Alert.alert('加载失败', '获取借用记录失败，请下拉刷新重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(true);
  };

  // 取消借用（仅 pending/approved 可取消）
  const handleCancel = (bookingId: string, assetName: string) => {
    Alert.alert('取消借用', `确定要取消「${assetName}」的借用申请吗？`, [
      { text: '再想想', style: 'cancel' },
      {
        text: '确认取消',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(bookingId);
            Alert.alert('已取消', '借用申请已取消');
            fetchBookings();
          } catch (err: unknown) {
            handleApiError(err, '取消失败');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: BookingWithAsset }) => {
    const asset = item.assets;
    const statusColor = getStatusColor(item.status);
    const imageUrl = asset?.images?.[0];
    const assetName = asset?.name || '未知设备';

    // 根据状态决定可用操作
    const canReturn = item.status === 'active' || item.status === 'overdue';
    const canCancel = item.status === 'pending' || item.status === 'approved';
    const canReview = item.status === 'returned';

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
                <Text style={[styles.status, { color: statusColor }]}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>

            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>借用周期：</Text>
              <Text style={styles.dateRange}>
                {item.start_date} 至 {item.end_date}
              </Text>
            </View>
          </View>
        </View>

        {/* 操作按钮区域 */}
        {(canReturn || canCancel || canReview) && (
          <View style={styles.actionRow}>
            {canReturn && (
              <>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('ReturnScreen', {
                    bookingId: item.id,
                    assetName,
                  })}
                >
                  <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.actionText}>拍照归还</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={() => navigation.navigate('DamageReport', {
                    assetId: item.asset_id,
                    bookingId: item.id,
                  })}
                >
                  <Ionicons name="warning-outline" size={16} color={theme.colors.danger} />
                  <Text style={[styles.actionText, { color: theme.colors.danger }]}>损坏报修</Text>
                </TouchableOpacity>
              </>
            )}
            {canCancel && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => handleCancel(item.id, assetName)}
              >
                <Ionicons name="close-circle-outline" size={16} color={theme.colors.danger} />
                <Text style={[styles.actionText, { color: theme.colors.danger }]}>取消借用</Text>
              </TouchableOpacity>
            )}
            {canReview && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnReview]}
                onPress={() => {
                  setSelectedBooking({ id: item.id, name: assetName });
                  setReviewModalVisible(true);
                }}
              >
                <Ionicons name="star-outline" size={16} color={theme.colors.warning} />
                <Text style={[styles.actionText, { color: theme.colors.warning }]}>评价设备</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>我的借用记录</Text>
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
            <Text style={styles.emptyTitle}>暂无借用记录</Text>
            <Text style={styles.emptySubtitle}>您还没有借用过任何东西，快去首页逛逛吧</Text>
            <TouchableOpacity
              style={styles.goHomeButton}
              onPress={() => navigation.navigate('HomeTab')}
            >
              <Text style={styles.goHomeButtonText}>去首页看看</Text>
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
          onSuccess={() => {
            fetchBookings();
          }}
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
  },
  // 操作按钮
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
    gap: 10,
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
