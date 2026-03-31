import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { alertManager } from '../../utils/alertManager';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import {
  registerStudent,
  signOut,
  verifyStudentIdentity,
  type VerifiedStudentIdentity,
} from '../../services/authService';
import { AuthStackParamList } from '../../navigation/AuthStackNavigator';
import { getDisplayErrorMessage } from '../../utils/errorHandler';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
type RegisterStep = 1 | 2 | 3;

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<RegisterStep>(1);
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifiedIdentity, setVerifiedIdentity] = useState<VerifiedStudentIdentity | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [registering, setRegistering] = useState(false);

  const showError = (error: unknown) => {
    const rawMessage = error instanceof Error ? error.message : '';

    const translationKey =
      rawMessage === 'student_not_found'
        ? 'auth.register.studentNotFound'
        : rawMessage === 'name_mismatch'
          ? 'auth.register.nameMismatch'
          : rawMessage === 'already_registered' ||
              rawMessage === 'student_not_found_or_already_bound'
            ? 'auth.register.alreadyRegistered'
            : rawMessage === 'identity_verification_failed'
              ? 'auth.register.identityVerificationFailed'
              : rawMessage === 'user_not_created'
                ? 'auth.register.userNotCreated'
                : null;

    alertManager.alert(
      t('auth.register.alertTitle'),
      translationKey ? t(translationKey) : getDisplayErrorMessage(error)
    );
  };

  const handleVerify = async () => {
    if (!studentId.trim() || !fullName.trim()) {
      alertManager.alert(t('auth.register.alertTitle'), t('auth.register.errorMissingIdentity'));
      return;
    }

    setVerifying(true);
    try {
      const result = await verifyStudentIdentity(studentId, fullName);
      setVerifiedIdentity(result);
      setStep(2);
    } catch (error: unknown) {
      showError(error);
    } finally {
      setVerifying(false);
    }
  };

  const handleRegister = async () => {
    if (!verifiedIdentity) {
      alertManager.alert(t('auth.register.alertTitle'), t('auth.register.identityRequired'));
      return;
    }

    if (!email.trim() || !password.trim()) {
      alertManager.alert(t('auth.register.alertTitle'), t('auth.register.errorMissingFields'));
      return;
    }

    // Bug #002: 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      alertManager.alert(t('auth.register.invalidEmailTitle'), t('auth.register.errorInvalidEmail'));
      return;
    }

    if (password !== confirmPassword) {
      alertManager.alert(t('auth.register.alertTitle'), t('auth.register.errorPasswordMismatch'));
      return;
    }

    if (password.length < 6) {
      alertManager.alert(t('auth.register.alertTitle'), t('auth.register.errorPasswordTooShort'));
      return;
    }

    setRegistering(true);
    try {
      await registerStudent(
        studentId,
        fullName,
        email,
        password,
        verifiedIdentity.department,
        verifiedIdentity.enrollmentYear
      );
      await signOut().catch(() => {});
      setStep(3);
    } catch (error: unknown) {
      showError(error);
    } finally {
      setRegistering(false);
    }
  };

  const renderIdentitySummary = () => {
    if (!verifiedIdentity) return null;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{t('auth.register.verifiedCardTitle')}</Text>
        <Text style={styles.summaryLine}>
          {t('auth.register.departmentValue')}: {verifiedIdentity.department}
        </Text>
        <Text style={styles.summaryLine}>
          {t('auth.register.enrollmentYearValue')}: {verifiedIdentity.enrollmentYear}
        </Text>
      </View>
    );
  };

  const renderStepOne = () => (
    <>
      <View style={styles.stepHeader}>
        <Text style={styles.stepText}>{t('auth.register.stepLabel', { current: 1 })}</Text>
        <Text style={styles.stepTitle}>{t('auth.register.identityStepTitle')}</Text>
        <Text style={styles.stepSubtitle}>{t('auth.register.identityStepSubtitle')}</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('auth.register.studentIdLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('auth.register.studentIdPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={studentId}
          onChangeText={setStudentId}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('auth.register.fullNameLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('auth.register.fullNamePlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={fullName}
          onChangeText={setFullName}
        />
      </View>

      {renderIdentitySummary()}

      <TouchableOpacity
        style={[styles.registerButton, verifying && styles.disabledButton]}
        onPress={handleVerify}
        disabled={verifying}
      >
        {verifying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.registerButtonText}>{t('auth.register.verifyAction')}</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderStepTwo = () => (
    <>
      <View style={styles.stepHeader}>
        <Text style={styles.stepText}>{t('auth.register.stepLabel', { current: 2 })}</Text>
        <Text style={styles.stepTitle}>{t('auth.register.credentialsStepTitle')}</Text>
        <Text style={styles.stepSubtitle}>{t('auth.register.credentialsStepSubtitle')}</Text>
      </View>

      <View style={styles.identityBadge}>
        <Text style={styles.identityBadgeText}>
          {fullName.trim()} · {studentId.trim()}
        </Text>
      </View>

      {renderIdentitySummary()}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('auth.register.emailLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('auth.register.emailPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('auth.register.passwordLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('auth.register.passwordPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('auth.register.confirmPasswordLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('auth.register.confirmPasswordPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setStep(1)}
          disabled={registering}
        >
          <Text style={styles.secondaryButtonText}>{t('auth.register.backAction')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryActionButton, registering && styles.disabledButton]}
          onPress={handleRegister}
          disabled={registering}
        >
          {registering ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>{t('auth.register.submit')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStepThree = () => (
    <View style={styles.successContainer}>
      <Text style={styles.stepText}>{t('auth.register.stepLabel', { current: 3 })}</Text>
      <Text style={styles.successIcon}>✓</Text>
      <Text style={styles.stepTitle}>{t('auth.register.successStepTitle')}</Text>
      <Text style={styles.successWelcome}>
        {t('auth.register.successWelcome', { name: fullName.trim() })}
      </Text>
      <Text style={styles.successDescription}>{t('auth.register.successStepMessage')}</Text>

      {renderIdentitySummary()}

      <TouchableOpacity
        style={styles.registerButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.registerButtonText}>{t('auth.register.goLogin')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.register.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>
          </View>

          <View style={styles.form}>
            {step === 1 ? renderStepOne() : null}
            {step === 2 ? renderStepTwo() : null}
            {step === 3 ? renderStepThree() : null}

            {step !== 3 ? (
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginText}>
                  {t('auth.register.existingAccount')}
                  <Text style={styles.loginHighlight}>{t('auth.register.loginAction')}</Text>
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1B4B',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#A5B4FC',
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  stepHeader: {
    marginBottom: 20,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  stepSubtitle: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: 6,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  identityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  identityBadgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  summaryLine: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: 4,
  },
  registerButton: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    marginRight: 12,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    color: '#10B981',
    marginVertical: 12,
    fontWeight: '800',
  },
  successWelcome: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 18,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  loginHighlight: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
