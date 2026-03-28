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
  ScrollView,
  RefreshControl,
} from 'react-native';
import { alertManager } from '../../utils/alertManager';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ProfileStackParamList } from '../../navigation/ProfileStackNavigator';
import { theme } from '../../theme';
import { signOut, getMyProfile } from '../../services/authService';
import { DEFAULT_APP_SETTINGS, getAppSettings } from '../../services/appSettingsService';
import { getUnreadCount } from '../../services/notificationService';
import { handleApiError } from '../../utils/errorHandler';
import type { Profile } from '../../../../database/types/supabase';
import { useTranslation } from 'react-i18next';
import SafeImage from '../../components/SafeImage';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;
};

// ============================================================
// Helpers. 辅助函数
// ============================================================

/** Credit score color: green ≥ 80, yellow ≥ 60, red < 60. 信用分颜色分级 */
function creditColor(score: number): string {
  if (score >= 80) return theme.colors.success;
  if (score >= 60) return theme.colors.warning;
  return theme.colors.danger;
}

/** Credit score level label key. 信用分等级对应的 i18n key */
function creditLevelKey(score: number): string {
  if (score >= 80) return 'profile.creditLevelExcellent';
  if (score >= 60) return 'profile.creditLevelGood';
  if (score >= 40) return 'profile.creditLevelWarning';
  return 'profile.creditLevelRisk';
}

// ============================================================
// Sub-component: MenuItem. 菜单行
// ============================================================

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
  danger?: boolean;
  rightContent?: React.ReactNode;
}

function MenuItem({ icon, label, onPress, badge, danger, rightContent }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={20} color={danger ? theme.colors.danger : theme.colors.text} />
        {(badge ?? 0) > 0 && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{(badge ?? 0) > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.menuText, danger && { color: theme.colors.danger }]}>{label}</Text>
      {rightContent ?? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.gray} />
      )}
    </TouchableOpacity>
  );
}

// ============================================================
// Main Screen. 个人中心主屏
// ============================================================

export default function ProfileScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appSettings, setAppSettings] = useState(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [profileData, count, settings] = await Promise.all([
        getMyProfile(),
        getUnreadCount(),
        getAppSettings(),
      ]);
      setProfile(profileData as unknown as Profile);
      setUnreadCount(count);
      setAppSettings(settings);
    } catch (err) {
      alertManager.alert(t('profile.prompt'), t('profile.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // useFocusEffect 确保每次返回时刷新资料和未读数
  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData])
  );

  const performSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      // RootNavigator 监听到 session 为 null 后自动跳转登录页
    } catch (err: unknown) {
      handleApiError(err, t('profile.logoutFailed'));
      setLoggingOut(false);
    }
  };

  const handleSignOut = () => {
    if (!appSettings.confirmBeforeLogout) {
      void performSignOut();
      return;
    }

    alertManager.alert(t('profile.logoutConfirm'), t('profile.logoutConfirmMessage'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: () => void performSignOut(),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  const score = profile?.credit_score ?? 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View pointerEvents="none" style={styles.topBackground} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchData(true)}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.pageContent}>
          {/* ── 头部区域 ── */}
          <View style={styles.header}>
            {/* 右上角通知铃铛快捷入口（最外层，高频操作） */}
            <TouchableOpacity
              style={styles.headerBell}
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* 头像 */}
            <SafeImage
              uri={profile?.avatar_url}
              style={styles.avatar}
              placeholderIcon="person"
              placeholderSize={36}
            />
            <Text style={styles.name}>{profile?.full_name ?? t('profile.defaultName')}</Text>
            <Text style={styles.email}>{profile?.email ?? ''}</Text>

            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.editProfileButtonText}>{t('profile.editProfile')}</Text>
            </TouchableOpacity>

            {/* 学号 / 学院 行 */}
            <View style={styles.headerInfoRow}>
              <Text style={styles.headerInfoItem}>
                {t('profile.studentId')}：{profile?.student_id ?? t('profile.notSet')}
              </Text>
              <View style={styles.headerInfoDot} />
              <Text style={styles.headerInfoItem}>
                {profile?.department || t('profile.notSet')}
              </Text>
            </View>
          </View>

          <View style={styles.body}>
            {/* ── 信用分卡片（悬浮，可点击进入明细） ── */}
            <TouchableOpacity
              style={styles.creditCard}
              onPress={() => navigation.navigate('CreditScoreLog')}
              activeOpacity={0.85}
            >
              <View style={styles.creditLeft}>
                <Text style={[styles.creditValue, { color: creditColor(score) }]}>{score}</Text>
                <Text style={styles.creditUnit}>{t('profile.creditScore')}</Text>
              </View>
              <View style={styles.creditRight}>
                <View style={[styles.creditLevelBadge, { backgroundColor: `${creditColor(score)}18` }]}>
                  <Text style={[styles.creditLevelText, { color: creditColor(score) }]}>
                    {t(creditLevelKey(score))}
                  </Text>
                </View>
                <View style={styles.creditDetailRow}>
                  <Text style={styles.creditDetailText}>{t('profile.creditScoreDetail')}</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.colors.gray} />
                </View>
              </View>
            </TouchableOpacity>

            {/* ── 账户分组 ── */}
            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>{t('profile.sectionAccount')}</Text>
            </View>
            <View style={styles.menuSection}>
              <MenuItem
                icon="notifications-outline"
                label={t('profile.notifications')}
                badge={unreadCount}
                onPress={() => navigation.navigate('Notifications')}
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon="lock-closed-outline"
                label={t('profile.changePassword')}
                onPress={() => navigation.navigate('ChangePassword')}
              />
            </View>

            {/* ── 偏好分组 ── */}
            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>{t('profile.sectionPreferences')}</Text>
            </View>
            <View style={styles.menuSection}>
              <MenuItem
                icon="language-outline"
                label={i18n.language === 'zh' ? 'English' : '中文'}
                onPress={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
                rightContent={
                  <Ionicons name="swap-horizontal" size={18} color={theme.colors.gray} />
                }
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon="book-outline"
                label={t('profile.helpManual')}
                onPress={() => navigation.navigate('HelpManual')}
              />
            </View>

            {/* ── 退出登录 ── */}
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
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// Styles. 样式
// ============================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topBackground: {
    position: 'absolute',
    top: Platform.OS === 'android' ? -(StatusBar.currentHeight ?? 0) : 0,
    left: 0,
    right: 0,
    height: 360 + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0),
    backgroundColor: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },
  pageContent: {
    flexGrow: 1,
  },
  body: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingBottom: theme.spacing.md,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 头部
  header: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 16,
    paddingHorizontal: theme.spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerBell: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
  bellBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: theme.colors.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
  },
  editProfileButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  name: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 3,
  },
  email: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 12,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerInfoItem: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  headerInfoDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  // 信用分卡片
  creditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: theme.spacing.md,
    marginTop: -24,
    borderRadius: 16,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  creditLeft: {
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  creditValue: {
    fontSize: 40,
    fontWeight: 'bold',
    lineHeight: 44,
  },
  creditUnit: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 2,
  },
  creditRight: {
    flex: 1,
    gap: 8,
  },
  creditLevelBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  creditLevelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  creditDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  creditDetailText: {
    fontSize: 13,
    color: theme.colors.gray,
  },

  // 分组标题
  sectionLabel: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  sectionLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // 菜单
  menuSection: {
    backgroundColor: '#fff',
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
  },
  menuIconWrap: {
    position: 'relative',
    marginRight: theme.spacing.sm,
  },
  menuBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: theme.colors.danger,
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F3F4F6',
    marginLeft: theme.spacing.md + 28,
  },

  // 退出
  logoutSection: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 8,
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
