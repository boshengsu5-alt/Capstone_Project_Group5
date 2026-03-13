import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import NotificationItem from '../../components/NotificationItem';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/notificationService';
import type { Notification } from '../../../../database/types/supabase';

// 将 ISO 时间字符串转成易读格式
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMyNotifications();
      setNotifications(data);
    } catch (err: any) {
      setError(err?.message ?? '加载失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 点击单条 → 标记已读
  const handlePress = async (item: Notification) => {
    if (item.is_read) return;
    try {
      await markNotificationAsRead(item.id);
      setNotifications(prev =>
        prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n))
      );
    } catch {
      // 静默失败，不影响 UI
    }
  };

  // 全部标为已读
  const handleMarkAll = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      // 静默失败
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ── 渲染列表项 ──
  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.75}>
      <NotificationItem
        title={item.title}
        message={item.message}
        time={formatTime(item.created_at)}
        isRead={item.is_read}
      />
    </TouchableOpacity>
  );

  // ── 空状态 ──
  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>暂无通知</Text>
      <Text style={styles.emptySubtitle}>预约审核、归还提醒等通知会显示在这里</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── 头部 ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>消息通知</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadBadge}>{unreadCount} 条未读</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll}>
            <Text style={styles.markAllText}>全部已读</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── 内容区域 ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>加载中…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchNotifications()}>
            <Text style={styles.retryText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor="#6200ee"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F5F5F5',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333333' },
  unreadBadge: { fontSize: 13, color: '#6200ee', fontWeight: '600', marginTop: 2 },

  markAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#EDE7F6',
    borderRadius: 20,
  },
  markAllText: { fontSize: 13, color: '#6200ee', fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  listEmpty: { flexGrow: 1 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#999' },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#444', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 22 },
});
