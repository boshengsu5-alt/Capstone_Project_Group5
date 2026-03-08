import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const FAKE_BOOKINGS = [
  { id: '1', item: 'Sony A7M4', date: '2026-03-05', returnDate: '2026-03-10', status: '已借用', icon: 'camera-outline' },
  { id: '2', item: 'Canon 24-70mm f/2.8', date: '2026-03-01', returnDate: '2026-03-04', status: '已逾期', icon: 'camera-lens' },
  { id: '3', item: 'DJI Ronin RS3', date: '2026-02-28', returnDate: '2026-03-02', status: '已归还', icon: 'video-outline' },
  { id: '4', item: 'Apple iPad Pro', date: '2026-02-15', returnDate: '2026-02-20', status: '已归还', icon: 'tablet-landscape-outline' },
  { id: '5', item: 'Zoom H6 Audio Recorder', date: '2026-02-10', returnDate: '2026-02-12', status: '已归还', icon: 'mic-outline' },
];

export default function BookingHistoryScreen() {
  const [activeTab, setActiveTab] = useState('全部');

  const getStatusStyle = (status: string) => {
    switch (status) {
      case '已借用':
        return { color: '#FA8C16', bg: '#FFF7E6', label: '借用中', icon: 'time-outline' };
      case '已逾期':
        return { color: '#F5222D', bg: '#FFF1F0', label: '已逾期', icon: 'alert-circle-outline' };
      case '已归还':
        return { color: '#52C41A', bg: '#F6FFED', label: '已归还', icon: 'checkmark-circle-outline' };
      default:
        return { color: '#8C8C8C', bg: '#F5F5F5', label: '未知', icon: 'help-circle-outline' };
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const statusStyle = getStatusStyle(item.status);
    const isStacked = index > 0;

    return (
      <View style={[styles.cardWrapper, isStacked && styles.stackedCard]}>
        <View style={[styles.card, { borderTopWidth: isStacked ? 1 : 0, borderColor: 'rgba(255,255,255,0.7)' }]}>
          <View style={[styles.colorBar, { backgroundColor: statusStyle.color }]} />

          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
              <View style={styles.itemIconContainer}>
                {item.icon.includes('lens') ? (
                  <MaterialCommunityIcons name="camera-lens" size={20} color="#333" />
                ) : (
                  <Ionicons name={item.icon as any} size={20} color="#333" />
                )}
              </View>
              <Text style={styles.itemName} numberOfLines={1}>{item.item}</Text>

              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Ionicons name={statusStyle.icon as any} size={14} color={statusStyle.color} style={{ marginRight: 4 }} />
                <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailsRow}>
              <View style={styles.dateInfoContainer}>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={14} color="#8C8C8C" style={styles.dateIcon} />
                  <Text style={styles.dateLabel}>借出:</Text>
                  <Text style={styles.dateValue}>{item.date}</Text>
                </View>
                <View style={[styles.dateRow, { marginTop: 6 }]}>
                  <Ionicons name="calendar" size={14} color="#8C8C8C" style={styles.dateIcon} />
                  <Text style={styles.dateLabel}>应还:</Text>
                  <Text style={[styles.dateValue, item.status === '已逾期' && { color: '#F5222D', fontWeight: '700' }]}>
                    {item.returnDate}
                  </Text>
                </View>
              </View>

              {item.status === '已借用' && (
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>去归还</Text>
                  <Ionicons name="arrow-forward" size={12} color="#FFF" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const displayData = FAKE_BOOKINGS.filter(
    b => activeTab === '全部' || b.status.includes(activeTab.replace('中', ''))
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>我的借阅</Text>
        <Text style={styles.subtitle}>管理您的设备借还记录</Text>
      </View>

      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrapper}>
          {['全部', '借用中', '已逾期', '已归还'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={displayData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA', // Softer, more modern background color
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 30, // Increased top padding for better breathing room
    paddingBottom: 20,
  },
  title: {
    fontSize: 32, // Slightly larger, more impactful title
    fontWeight: '800',
    color: '#111111',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '400',
  },
  tabsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#EAECEF',
    borderRadius: 24,
    padding: 4, // Inner padding to create a pill-box effect
  },
  tabItem: {
    flex: 1, // Distribute tabs evenly
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#777777',
  },
  tabTextActive: {
    color: '#111111', // High contrast for active tab
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  cardWrapper: {
    marginBottom: 0,
  },
  stackedCard: {
    marginTop: -14, // Slightly reduced overlap for cleaner look
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18, // Slightly softer corners
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 }, // Subtler shadow
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0', // Very subtle border for crispness
  },
  colorBar: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    flex: 1,
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F5',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  dateInfoContainer: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 6,
  },
  dateLabel: {
    fontSize: 13,
    color: '#8C8C8C',
    width: 36, // Fixed width to align the dates
  },
  dateValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    fontFamily: 'System', // Use system default monospace if possible or just standard
  },
  actionBtn: {
    backgroundColor: '#111111', // sleek black button
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
