import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import type { NotificationType } from '../../../database/types/supabase';

// 不同通知类型对应的图标和颜色
const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  booking_approved: { icon: 'checkmark-circle', color: '#10b981' },
  booking_rejected: { icon: 'close-circle', color: theme.colors.danger },
  return_reminder: { icon: 'time', color: '#f59e0b' },
  overdue_alert: { icon: 'alert-circle', color: theme.colors.danger },
  damage_reported: { icon: 'warning', color: '#f97316' },
  system: { icon: 'information-circle', color: theme.colors.primary },
};

interface NotificationItemProps {
  title: string;
  message: string;
  time: string;
  type: NotificationType;
  isRead?: boolean;
  onPress?: () => void;
}

export default function NotificationItem({ title, message, time, type, isRead = false, onPress }: NotificationItemProps) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.system;

  return (
    <TouchableOpacity
      style={[styles.container, isRead && styles.readContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: config.color + '18' }]}>
        <Ionicons name={config.icon as any} size={22} color={config.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, isRead && styles.readText]} numberOfLines={1}>{title}</Text>
          {!isRead && <View style={styles.dot} />}
        </View>
        <Text style={[styles.message, isRead && styles.readText]} numberOfLines={2}>{message}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  readContainer: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  message: {
    fontSize: 13,
    color: theme.colors.gray,
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    color: theme.colors.gray,
  },
  readText: {
    color: theme.colors.gray,
  },
});
