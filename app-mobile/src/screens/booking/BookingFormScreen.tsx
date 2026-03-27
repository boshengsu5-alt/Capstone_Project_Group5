import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { theme } from '../../theme';
import { createBooking } from '../../services/bookingService';
import { handleApiError } from '../../utils/errorHandler';
import { alertManager } from '../../utils/alertManager';

type Props = NativeStackScreenProps<HomeStackParamList, 'BookingFormScreen'>;

/** 将 ISO 日期时间字符串格式化为可读形式。将 "2026-03-25T09:00:00" 转为 "2026-03-25  09:00" */
function formatDateTime(dt: string): string {
  const [datePart, timePart] = dt.split('T');
  if (!timePart) return datePart;
  // 只取 HH:mm，去掉秒
  return `${datePart}  ${timePart.slice(0, 5)}`;
}

export default function BookingFormScreen({ route, navigation }: Props) {
  const { assetId, startDate, endDate } = route.params;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // 前端日期校验防御：确保日期参数合法
    if (!startDate || !endDate) {
      alertManager.alert('日期缺失', '请先在日历上选择借用起止日期');
      return;
    }

    const startAt = new Date(startDate);
    const endAt = new Date(endDate);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      alertManager.alert('日期错误', '所选日期无效，请重新选择');
      return;
    }

    if (endAt.getTime() < startAt.getTime()) {
      alertManager.alert('日期错误', '结束日期不能早于开始日期');
      return;
    }

    try {
      setIsSubmitting(true);
      await createBooking(assetId, startDate, endDate);

      alertManager.alert('提交成功', '预约申请已提交，等待管理员审批！', [
        { text: '确定', onPress: () => navigation.popToTop() },
      ]);
    } catch (error: unknown) {
      handleApiError(error, '提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>提交借用申请</Text>
        <Text style={styles.subtitle}>正在为设备 ID: {assetId} 办理借用</Text>

        <View style={styles.card}>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>取借时间</Text>
            <Text style={styles.dateValue}>{formatDateTime(startDate)}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>归还时间</Text>
            <Text style={styles.dateValue}>{formatDateTime(endDate)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>确认并提交</Text>
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
  },
  container: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: theme.spacing.xl,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  dateLabel: {
    fontSize: 16,
    color: theme.colors.gray,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.gray,
    opacity: 0.7,
  },
  submitButtonText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  }
});
