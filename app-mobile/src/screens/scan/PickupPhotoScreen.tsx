import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { alertManager } from '../../utils/alertManager';
import { useNavigation, useRoute } from '@react-navigation/native';
import PhotoCapture from '../../components/PhotoCapture';
import { uploadPickupPhoto, savePickupPhoto } from '../../services/bookingService';
import { theme } from '../../theme';
import { handleApiError } from '../../utils/errorHandler';
import { useTranslation } from 'react-i18next';

// ─────────────────────────────────────────────────
// Step indicator. 步骤指示器
// ─────────────────────────────────────────────────
type Step = 1 | 2 | 3;

const PRIMARY_ACCENT = '#6366f1';
const SUCCESS = '#00897B';

function StepIndicator({ current, labels }: { current: Step; labels: string[] }) {
  const steps = [1, 2, 3] as const;
  return (
    <View style={styles.stepRow}>
      {steps.map((num, idx) => {
        const done = current > num;
        const active = current === num;
        return (
          <React.Fragment key={num}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  done && styles.stepDone,
                  active && styles.stepActive,
                ]}
              >
                {done ? (
                  <Text style={styles.stepCheckmark}>✓</Text>
                ) : (
                  <Text style={[styles.stepNum, active && styles.stepNumActive]}>{num}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  active && styles.stepLabelActive,
                  done && styles.stepLabelDone,
                ]}
              >
                {labels[idx]}
              </Text>
            </View>
            {idx < steps.length - 1 && (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────
// Main Screen. 取货拍照主屏幕
// ─────────────────────────────────────────────────
export default function PickupPhotoScreen() {
  const { t } = useTranslation();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigation = useNavigation();
  const route = useRoute<any>();
  const { bookingId, assetName = '' } = route.params ?? {};

  const stepLabels = [
    t('pickupPhoto.step1'),
    t('pickupPhoto.step2'),
    t('pickupPhoto.step3'),
  ];

  // 拍照完成 → 自动上传
  const handlePhotoCaptured = async (uri: string, base64?: string) => {
    setPhotoUri(uri);
    setStep(2);
    setIsUploading(true);

    try {
      const url = await uploadPickupPhoto(uri, bookingId, base64);
      setUploadedUrl(url);
      setStep(3);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : t('pickupPhoto.uploadFailedGeneric');
      alertManager.alert(
        t('pickupPhoto.uploadFailed'),
        errMsg,
        [{ text: t('pickupPhoto.retake'), onPress: () => { setPhotoUri(null); setStep(1); } }]
      );
    } finally {
      setIsUploading(false);
    }
  };

  // 确认保存取货照片
  const handleConfirm = async () => {
    if (!uploadedUrl || !bookingId) return;

    try {
      setIsSubmitting(true);
      await savePickupPhoto(bookingId, uploadedUrl);
      alertManager.alert(
        t('pickupPhoto.saveSuccess'),
        t('pickupPhoto.saveSuccessMsg', { asset: assetName }),
        [{ text: t('scan.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (error: unknown) {
      handleApiError(error, t('pickupPhoto.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 跳过拍照
  const handleSkip = () => {
    alertManager.alert(
      t('pickupPhoto.skipTitle'),
      t('pickupPhoto.skipMsg'),
      [
        { text: t('scan.cancel'), style: 'cancel' },
        { text: t('pickupPhoto.skipConfirm'), onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleRetake = () => {
    setPhotoUri(null);
    setUploadedUrl(null);
    setStep(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* 头部 */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('pickupPhoto.title')}</Text>
          <View style={styles.assetCard}>
            <Text style={styles.assetLabel}>{t('pickupPhoto.currentAsset')}</Text>
            <Text style={styles.assetName} numberOfLines={1}>{assetName}</Text>
          </View>
        </View>

        {/* 步骤指示器 */}
        <StepIndicator current={step} labels={stepLabels} />

        {/* Step 1 提示 */}
        {step === 1 && (
          <View style={styles.infoBanner}>
            <Text style={styles.bannerIcon}>📷</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{t('pickupPhoto.bannerTitle')}</Text>
              <Text style={styles.bannerText}>{t('pickupPhoto.bannerText')}</Text>
            </View>
          </View>
        )}

        {/* 相机 / 预览 */}
        {!photoUri ? (
          <View style={styles.cameraWrapper}>
            <PhotoCapture onPhotoCaptured={handlePhotoCaptured} />
          </View>
        ) : (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
            {isUploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="large" color={theme.colors.background} />
                <Text style={styles.uploadingText}>{t('pickupPhoto.uploading')}</Text>
              </View>
            )}
            {!isUploading && (
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                <Text style={styles.retakeBtnText}>{t('pickupPhoto.retakeBtn')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 上传成功提示 */}
        {uploadedUrl && (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>{t('pickupPhoto.uploadSuccess')}</Text>
          </View>
        )}

        {/* 确认保存按钮 */}
        {step === 3 && uploadedUrl && (
          <TouchableOpacity
            style={[styles.confirmBtn, isSubmitting && styles.confirmBtnDisabled]}
            disabled={isSubmitting}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <>
                <Text style={styles.confirmBtnIcon}>📸</Text>
                <Text style={styles.confirmBtnText}>{t('pickupPhoto.confirmSave')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* 跳过按钮 */}
        {step === 1 && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipBtnText}>{t('pickupPhoto.skip')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────
// Styles. 样式
// ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.inputBackground },
  scroll: { padding: theme.spacing.lg },

  header: { marginBottom: theme.spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: theme.colors.text, marginBottom: 12 },
  assetCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: PRIMARY_ACCENT,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  assetLabel: { fontSize: 14, color: theme.colors.gray, marginRight: theme.spacing.sm },
  assetName: { fontSize: 17, fontWeight: '700', color: theme.colors.text, flex: 1 },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: 4,
  },
  stepItem: { alignItems: 'center', flex: 0 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepActive: { backgroundColor: PRIMARY_ACCENT },
  stepDone: { backgroundColor: SUCCESS },
  stepNum: { fontSize: 14, fontWeight: '700', color: theme.colors.gray },
  stepNumActive: { color: theme.colors.background },
  stepCheckmark: { fontSize: 16, color: theme.colors.background, fontWeight: '800' },
  stepLabel: { fontSize: 11, color: theme.colors.gray, textAlign: 'center', maxWidth: 70 },
  stepLabelActive: { color: PRIMARY_ACCENT, fontWeight: '700' },
  stepLabelDone: { color: SUCCESS },
  stepLine: { flex: 1, height: 3, backgroundColor: '#E0E0E0', marginBottom: 20, marginHorizontal: 4, borderRadius: 2 },
  stepLineDone: { backgroundColor: SUCCESS },

  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'flex-start',
    gap: 12,
  },
  bannerIcon: { fontSize: 24, marginRight: 4 },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: PRIMARY_ACCENT, marginBottom: 4 },
  bannerText: { fontSize: 13, color: theme.colors.text, lineHeight: 20 },

  cameraWrapper: { marginBottom: theme.spacing.lg, borderRadius: 16, overflow: 'hidden' },
  previewWrapper: {
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    backgroundColor: '#000',
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  uploadingText: { color: theme.colors.background, fontSize: 16, fontWeight: '600' },
  retakeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retakeBtnText: { color: theme.colors.background, fontWeight: '700', fontSize: 14 },

  successCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 18,
    marginBottom: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successIcon: { fontSize: 20 },
  successText: { fontSize: 15, fontWeight: '600', color: SUCCESS, flex: 1 },

  confirmBtn: {
    backgroundColor: PRIMARY_ACCENT,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: PRIMARY_ACCENT,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  confirmBtnDisabled: { backgroundColor: theme.colors.gray, shadowOpacity: 0 },
  confirmBtnIcon: { fontSize: 20 },
  confirmBtnText: { color: theme.colors.background, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },

  skipBtn: {
    marginTop: theme.spacing.md,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  skipBtnText: { fontSize: 15, color: theme.colors.gray, textDecorationLine: 'underline' },
});
