import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { getCreditScoreLogs, getMyProfile } from '../../services/authService';
import type { CreditScoreLog } from '../../../../database/types/supabase';

// ============================================================
// Helpers. 辅助函数
// ============================================================

/** Map credit score to color. 根据信用分返回颜色 */
function scoreColor(score: number): string {
  if (score >= 80) return theme.colors.success;
  if (score >= 60) return theme.colors.warning;
  return theme.colors.danger;
}

/** Format ISO timestamp to locale date + time string. 格式化时间戳为可读字符串 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================
// Sub-component: CreditLogItem. 单条信用分记录
// ============================================================

interface CreditLogItemProps {
  item: CreditScoreLog;
  reasonLabel: string;
}

function CreditLogItem({ item, reasonLabel }: CreditLogItemProps) {
  const { t } = useTranslation();
  const isBonus = item.delta > 0;
  const deltaColor = isBonus ? theme.colors.success : theme.colors.danger;
  const iconName: keyof typeof Ionicons.glyphMap = isBonus
    ? 'arrow-up-circle'
    : 'arrow-down-circle';

  return (
    <View style={styles.item}>
      <Ionicons name={iconName} size={28} color={deltaColor} style={styles.itemIcon} />
      <View style={styles.itemBody}>
        <Text style={styles.itemReason}>{reasonLabel}</Text>
        <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={[styles.itemDelta, { color: deltaColor }]}>
          {isBonus ? `+${item.delta}` : `${item.delta}`}
        </Text>
        <Text style={styles.itemBalance}>
          {t('creditScoreLog.balanceAfter', { score: item.balance_after })}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// Main Screen. 信用分明细主屏
// ============================================================

export default function CreditScoreLogScreen() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<CreditScoreLog[]>([]);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [profile, data] = await Promise.all([getMyProfile(), getCreditScoreLogs()]);
      setCurrentScore((profile as { credit_score: number }).credit_score);
      setLogs(data);
    } catch {
      // 加载失败不弹窗，下拉提示文字已足够
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  /** Map reason code to i18n label. 原因代码映射为翻译文字 */
  function getReasonLabel(reason: string): string {
    const key = `creditScoreLog.reasons.${reason}`;
    const translated = t(key);
    // 如果 key 不存在，t() 会返回原始 key，则 fallback 到 unknown
    return translated === key ? t('creditScoreLog.reasons.unknown') : translated;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 当前信用分总览卡片 */}
      {currentScore !== null && (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>{t('creditScoreLog.currentScore')}</Text>
          <Text style={[styles.scoreValue, { color: scoreColor(currentScore) }]}>
            {currentScore}
          </Text>
        </View>
      )}

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CreditLogItem item={item} reasonLabel={getReasonLabel(item.reason)} />
        )}
        contentContainerStyle={logs.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Ionicons name="receipt-outline" size={56} color={theme.colors.gray} />
            <Text style={styles.emptyTitle}>{t('creditScoreLog.empty')}</Text>
            <Text style={styles.emptyHint}>{t('creditScoreLog.emptyHint')}</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

// ============================================================
// Styles. 样式
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  scoreCard: {
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: 16,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyHint: {
    fontSize: 13,
    color: theme.colors.gray,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    backgroundColor: '#fff',
  },
  itemIcon: {
    marginRight: theme.spacing.sm,
  },
  itemBody: {
    flex: 1,
  },
  itemReason: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 3,
  },
  itemDate: {
    fontSize: 12,
    color: theme.colors.gray,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemDelta: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemBalance: {
    fontSize: 11,
    color: theme.colors.gray,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F3F4F6',
  },
});
