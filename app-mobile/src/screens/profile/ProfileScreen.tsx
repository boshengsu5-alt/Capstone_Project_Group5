import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { alertManager } from '../../utils/alertManager';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ProfileStackParamList } from '../../navigation/ProfileStackNavigator';
import { theme } from '../../theme';
import { signOut, getMyProfile } from '../../services/authService';
import { getUnreadCount } from '../../services/notificationService';
import { handleApiError } from '../../utils/errorHandler';
import type { Profile } from '../../../../database/types/supabase';
import { useTranslation } from 'react-i18next';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;
};

export default function ProfileScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // useFocusEffect 确保每次从通知页返回时都重新查询未读数，使徽章保持最新
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const fetchData = async () => {
        try {
          const profileData = await getMyProfile() as unknown as Profile;
          if (!cancelled) setProfile(profileData);

          // 通过 service 层查询未读通知数量，不直接调用 supabase
          const count = await getUnreadCount();
          if (!cancelled) setUnreadCount(count);
        } catch (err) {
          if (!cancelled) alertManager.alert(t('profile.prompt'), t('profile.loadFailed'));
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      fetchData();
      return () => { cancelled = true; };
    }, [])
  );

  const handleSignOut = () => {
    alertManager.alert(t('profile.logoutConfirm'), t('profile.logoutConfirmMessage'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await signOut();
            // RootNavigator 会自动检测 session 变为 null，跳转到登录页
          } catch (err: unknown) {
            handleApiError(err, t('profile.logoutFailed'));
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 头部用户信息 */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.name}>{profile?.full_name ?? t('profile.defaultName')}</Text>
        <Text style={styles.email}>{profile?.email ?? ''}</Text>
      </View>

      {/* 信用分 / 学号 / 学院 信息卡片 */}
      <View style={styles.infoCard}>
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{profile?.credit_score ?? 100}</Text>
          <Text style={styles.infoLabel}>{t('profile.creditScore')}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{profile?.student_id ?? '—'}</Text>
          <Text style={styles.infoLabel}>{t('profile.studentId')}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={[styles.infoValue, { fontSize: 14 }]}>{profile?.department || t('profile.notSet')}</Text>
          <Text style={styles.infoLabel}>{t('profile.department')}</Text>
        </View>
      </View>

      {/* 菜单区域 */}
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Notifications')}
        >
          <View style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.menuText}>{t('profile.notifications')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.gray} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            const nextLang = i18n.language === 'zh' ? 'en' : 'zh';
            i18n.changeLanguage(nextLang);
          }}
        >
          <Ionicons name="language-outline" size={22} color={theme.colors.text} />
          <Text style={styles.menuText}>{i18n.language === 'zh' ? 'English' : '中文'}</Text>
          <Ionicons name="swap-horizontal" size={20} color={theme.colors.gray} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => alertManager.alert(t('profile.prompt'), t('profile.settingNotReady'))}
        >
          <Ionicons name="settings-outline" size={22} color={theme.colors.text} />
          <Text style={styles.menuText}>{t('profile.settings')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.gray} />
        </TouchableOpacity>
      </View>

      {/* 退出登录按钮 */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleSignOut}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingBottom: theme.spacing.xl + 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: theme.spacing.md,
    marginTop: -20,
    borderRadius: 12,
    paddingVertical: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.gray,
  },
  infoDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  menuSection: {
    marginTop: theme.spacing.lg,
    backgroundColor: '#fff',
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: theme.colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoutSection: {
    marginTop: 'auto',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  logoutButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
