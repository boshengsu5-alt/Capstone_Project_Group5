import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/ProfileStackNavigator';
import { theme } from '../../theme';
import NotificationItem from '../../components/NotificationItem';
import { getMyNotifications, markAsRead, markAllAsRead } from '../../services/notificationService';
import type { Notification } from '../../../../database/types/supabase';
import { useTranslation } from 'react-i18next';
import { getNotificationText } from '../../utils/notificationText';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Notifications'>;
};

// 将 ISO 时间字符串转成易读格式
function formatTime(
  dateStr: string,
  t: (key: string, options?: Record<string, unknown>) => string,
  language: string
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t('notifications.time.justNow');
  if (diffMin < 60) return t('notifications.time.minutesAgo', { count: diffMin });
  if (diffHour < 24) return t('notifications.time.hoursAgo', { count: diffHour });
  if (diffDay < 7) return t('notifications.time.daysAgo', { count: diffDay });
  return date.toLocaleDateString(language?.startsWith('zh') ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric' });
}

export default function NotificationScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data);
    } catch (err) {
      // console.error('[NotificationScreen] 获取通知失败:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 每次页面获得焦点时刷新
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handlePressItem = async (item: Notification) => {
    // 未读时先标记已读，再跳转详情；已读则直接跳转
    if (!item.is_read) {
      try {
        await markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        // console.error('[NotificationScreen] 标记已读失败:', err);
      }
    }
    navigation.navigate('NotificationDetail', { notification: { ...item, is_read: true } });
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      // console.error('[NotificationScreen] 全部标记已读失败:', err);
    }
  };

  const hasUnread = notifications.some((n) => !n.is_read);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 全部已读按钮 */}
      {hasUnread && (
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
          <Ionicons name="checkmark-done" size={18} color={theme.colors.primary} />
          <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
        </TouchableOpacity>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={64} color={theme.colors.gray} />
          <Text style={styles.emptyText}>{t('notifications.emptyTitle')}</Text>
          <Text style={styles.emptySubtext}>{t('notifications.emptyMessage')}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const { title, message } = getNotificationText(t, item);
            return (
              <NotificationItem
                title={title}
                message={message}
                time={formatTime(item.created_at, t, i18n.language)}
                type={item.type}
                isRead={item.is_read}
                onPress={() => handlePressItem(item)}
              />
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.inputBackground,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    padding: theme.spacing.md,
    gap: 4,
  },
  markAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  list: {
    padding: theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
});
