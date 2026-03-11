import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { theme } from '../../theme';
import { supabase } from '../../services/supabase';

type Props = NativeStackScreenProps<HomeStackParamList, 'BookingFormScreen'>;

export default function BookingFormScreen({ route, navigation }: Props) {
  const { assetId, startDate, endDate } = route.params;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // 1. Get current logged-in user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('错误', '请先登录后再进行预约');
        return;
      }

      // 2. Insert record into bookings table
      const { error: insertError } = await (supabase
        .from('bookings')
        .insert([
          {
            asset_id: assetId,
            borrower_id: user.id,
            start_date: startDate,
            end_date: endDate,
            status: 'pending',
            notes: '',
          }
        ] as any));

      if (insertError) {
        throw insertError;
      }

      // 3. Success Feedback
      Alert.alert(
        '成功',
        '预约申请已提交！',
        [
          {
            text: '确定',
            onPress: () => navigation.popToTop() // Return to HomeScreen
          }
        ]
      );

    } catch (error: any) {
      console.error('[BookingFormScreen] Submission error:', error);
      Alert.alert('提交失败', error.message || '请稍后再试');
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
            <Text style={styles.dateLabel}>开始日期:</Text>
            <Text style={styles.dateValue}>{startDate}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>结束日期:</Text>
            <Text style={styles.dateValue}>{endDate}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: '#F9FAFB',
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
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
