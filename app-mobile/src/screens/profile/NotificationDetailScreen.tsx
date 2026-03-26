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
import type { NotificationType } from '../../../../database/types/supabase';
import { useTranslation } from 'react-i18next';

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  booking_approved: { icon: 'checkmark-circle', color: '#10b981' },
  booking_rejected: { icon: 'close-circle', color: theme.colors.danger },
  return_reminder: { icon: 'time', color: '#f59e0b' },
  overdue_alert: { icon: 'alert-circle', color: theme.colors.danger },
  damage_reported: { icon: 'warning', color: '#f97316' },
  review_reply: { icon: 'chatbubbles', color: '#8b5cf6' },
  system: { icon: 'information-circle', color: theme.colors.primary },
};

const getNotificationText = (t: any, type: string, origTitle: string, origMsg: string) => {
  const tTitle = t(`notifications.types.${type}.title`);
  const tMessage = t(`notifications.types.${type}.message`);
  if (tTitle && tTitle !== `notifications.types.${type}.title`) {
    return { title: tTitle, message: tMessage };
  }
  return { title: origTitle, message: origMsg };
};

function formatFullTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'NotificationDetail'>;
  route: RouteProp<ProfileStackParamList, 'NotificationDetail'>;
};

export default function NotificationDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { notification } = route.params;
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system;
  const { title, message } = getNotificationText(t, notification.type, notification.title, notification.message);

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
        <Text style={styles.time}>{formatFullTime(notification.created_at)}</Text>

        {/* 分割线 */}
        <View style={styles.divider} />

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
