import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { alertManager } from '../../utils/alertManager';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { updatePassword } from '../../services/authService';
import { handleApiError } from '../../utils/errorHandler';
import { ProfileStackParamList } from '../../navigation/ProfileStackNavigator';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ChangePassword'>;
};

export default function ChangePasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      alertManager.alert(t('changePassword.errorFailed'), t('changePassword.errorTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      alertManager.alert(t('changePassword.errorFailed'), t('changePassword.errorNotMatch'));
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(newPassword);
      alertManager.alert(
        t('changePassword.successTitle'),
        t('changePassword.successMessage'),
        [{ text: t('changePassword.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (err: unknown) {
      handleApiError(err, t('changePassword.errorFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // KeyboardAvoidingView 包裹整个表单，防止键盘遮挡输入框
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('changePassword.newPassword')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={t('changePassword.newPasswordPlaceholder')}
                placeholderTextColor={theme.colors.gray}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowNew((v) => !v)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showNew ? t('changePassword.hide') : t('changePassword.show')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>{t('changePassword.confirmPassword')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={t('changePassword.confirmPasswordPlaceholder')}
                placeholderTextColor={theme.colors.gray}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showConfirm ? t('changePassword.hide') : t('changePassword.show')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t('changePassword.submit')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    marginBottom: theme.spacing.lg,
  },
  field: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  label: {
    fontSize: 13,
    color: theme.colors.gray,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 4,
  },
  eyeBtn: {
    paddingLeft: theme.spacing.sm,
  },
  eyeText: {
    fontSize: 13,
    color: theme.colors.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginHorizontal: theme.spacing.md,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
