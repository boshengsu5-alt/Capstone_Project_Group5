import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Image,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import type { Booking, Asset, BookingStatus } from '../../../../database/types/supabase';
import SafeImage from '../../components/SafeImage';
import { theme } from '../../theme';

// Define the joined data type
type BookingWithAsset = Booking & {
  assets: Asset | null;
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
    case 'overdue': return '#EF4444'; // Red
    case 'active': return '#F59E0B'; // Orange
    case 'returned': return '#10B981'; // Green
    case 'approved': return '#6366F1'; // Indigo/Purple
    case 'pending': return '#6B7280'; // Gray
    default: return '#9CA3AF';
  }
};

export default function BookingHistoryScreen() {
  const navigation = useNavigation<any>();
  const [bookings, setBookings] = useState<BookingWithAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('*, assets(*)')
        .eq('borrower_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data as BookingWithAsset[]);
    } catch (error) {
      // console.error('Error fetching bookings:', error);
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

  const renderItem = ({ item }: { item: BookingWithAsset }) => {
    const asset = item.assets;
    const statusColor = getStatusColor(item.status);
    const imageUrl = asset?.images?.[0];

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
              <Text style={styles.itemName} numberOfLines={1}>{asset?.name || '未知设备'}</Text>
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
            <Image 
              source={{ uri: 'https://img.icons8.com/illustrations/external-tulpahn-outline-color-tulpahn/100/external-empty-box-delivery-tulpahn-outline-color-tulpahn.png' }} 
              style={styles.emptyImage} 
            />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardContent: {
    flexDirection: 'row',
  },
  assetImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#9CA3AF',
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
    color: '#1F2937',
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
    color: '#6B7280',
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
