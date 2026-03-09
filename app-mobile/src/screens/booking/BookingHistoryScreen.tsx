import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView } from 'react-native';

import type { BookingStatus } from '../../../../database/types/supabase';

// Use an extended type because frontend needs to display asset names (typically from a join query).
// (因前端列表需展示资产名称，此处定义带有资产名称的联合数据类型以适配UI)
type BookingWithAsset = {
  id: string;
  asset_name: string;
  date: string;
  status: BookingStatus;
};

const FAKE_BOOKINGS: BookingWithAsset[] = [
  { id: '1', asset_name: 'Sony A7M4', date: '2026-03-05', status: 'returned' },
  { id: '2', asset_name: 'DJI Ronin RS3', date: '2026-03-07', status: 'active' },
  { id: '3', asset_name: 'Canon 24-70mm', date: '2026-03-01', status: 'overdue' },
  { id: '4', asset_name: 'Apple iPad Pro', date: '2026-03-06', status: 'active' },
];

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

export default function BookingHistoryScreen() {
  const renderItem = ({ item }: { item: BookingWithAsset }) => {
    // Determine visual priority based on status. Overdue items should be highly visible to enforce return policies.
    // (根据状态决定视觉优先级：逾期物品必须高亮警示，以强制执行资产归还政策)
    let statusColor = '#4CAF50';
    if (item.status === 'overdue') statusColor = '#F44336';
    if (item.status === 'active') statusColor = '#FF9800';

    return (
      <View style={[styles.card, { borderLeftColor: statusColor }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemName}>{item.asset_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.status, { color: statusColor }]}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        <Text style={styles.date}>借用日期：{item.date}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>我的借用记录</Text>
      <FlatList
        data={FAKE_BOOKINGS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FD',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#666666',
  },
});
