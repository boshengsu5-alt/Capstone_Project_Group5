import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PhotoCapture from '../../components/PhotoCapture';
import { uploadReturnPhoto, returnAsset } from '../../services/bookingService';
import { theme } from '../../theme';
import { handleApiError } from '../../utils/errorHandler';

// ─────────────────────────────────────────────────
// Step indicator helpers. 步骤指示器
// ─────────────────────────────────────────────────
type Step = 1 | 2 | 3;

const STEPS = [
  { num: 1, label: '拍摄实物照片' },
  { num: 2, label: '上传至云端' },
  { num: 3, label: '确认归还' },
] as const;

// 归还流程中的"成功"语义色（绿色）
const SUCCESS = '#00897B';
const SUCCESS_LIGHT = '#E0F2F1';

function StepIndicator({ current }: { current: Step }) {
  return (
    <View style={styles.stepRow}>
      {STEPS.map((s, idx) => {
        const done = current > s.num;
        const active = current === s.num;
        return (
          <React.Fragment key={s.num}>
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
                  <Text style={[styles.stepNum, active && styles.stepNumActive]}>
                    {s.num}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  active && styles.stepLabelActive,
                  done && styles.stepLabelDone,
                ]}
              >
                {s.label}
              </Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────
// URL display card. 上传链接展示卡片
// ─────────────────────────────────────────────────
function UploadedUrlCard({ url }: { url: string }) {
  return (
    <View style={styles.urlCard}>
      <View style={styles.urlHeader}>
        <Text style={styles.urlIcon}>🔗</Text>
        <Text style={styles.urlTitle}>照片已上传至云端</Text>
      </View>
      <Text style={styles.urlLabel}>归还凭证链接（已写入工单）：</Text>
      <View style={styles.urlBox}>
        <Text style={styles.urlText} numberOfLines={3} selectable>
          {url}
        </Text>
      </View>
      <Text style={styles.urlHint}>✅ 该链接已自动附加到您的归还工单，请妥善保管</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────
// Main Screen. 归还主屏幕
// ─────────────────────────────────────────────────
export default function ReturnScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Step 1 = 未拍照, Step 2 = 上传中, Step 3 = 上传成功，待确认
  const [step, setStep] = useState<Step>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigation = useNavigation();
  const route = useRoute<any>();
  const { bookingId, assetName = '未知设备' } = route.params ?? {};

  // Step 1 → 2: 照片拍摄完成，自动上传
  const handlePhotoCaptured = async (uri: string) => {
    // console.log('[ReturnScreen] 照片已拍摄，URI:', uri);
    setPhotoUri(uri);
    setStep(2);
    setIsUploading(true);

    try {
      const url = await uploadReturnPhoto(uri, bookingId);
      // console.log('[ReturnScreen] 上传成功，公开链接:', url);
      setUploadedUrl(url);
      setStep(3);
    } catch (error: any) {
      // console.error('[ReturnScreen] 上传失败:', error);
      let errMsg = error.message ?? '照片上传至云端时出错，请重拍后重试。';
      if (errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network')) {
        errMsg = '网络开小差了，请稍后再试';
      }
      Alert.alert(
        '上传失败',
        errMsg,
        [{ text: '重拍', onPress: () => { setPhotoUri(null); setStep(1); } }]
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Step 3: 确认归还
  const handleConfirmReturn = async () => {
    if (!uploadedUrl || !bookingId) return;

    try {
      setIsSubmitting(true);
      await returnAsset(bookingId, uploadedUrl);
      Alert.alert(
        '归还成功',
        `设备「${assetName}」已成功归还！\n\n归还照片已存档至工单，感谢您的使用。`,
        [{ text: '完成', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      handleApiError(error, '归还失败');
    } finally {
      setIsSubmitting(false);
    }
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
          <Text style={styles.title}>📦 归还设备</Text>
          <View style={styles.assetCard}>
            <Text style={styles.assetLabel}>当前归还：</Text>
            <Text style={styles.assetName} numberOfLines={1}>{assetName}</Text>
          </View>
        </View>

        {/* 步骤指示器 */}
        <StepIndicator current={step} />

        {/* Step 1 提示 */}
        {step === 1 && (
          <View style={styles.infoBanner}>
            <Text style={styles.bannerIcon}>📸</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>必须拍摄实物照片</Text>
              <Text style={styles.bannerText}>
                为明确归还时的设备状态，系统将强制要求拍摄一张设备实物照片。照片上传成功后方可完成归还。
              </Text>
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
                <Text style={styles.uploadingText}>正在上传至 Supabase Storage…</Text>
              </View>
            )}
            {!isUploading && (
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                <Text style={styles.retakeBtnText}>🔄 重拍</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 上传成功 URL 展示 */}
        {uploadedUrl && <UploadedUrlCard url={uploadedUrl} />}

        {/* 确认归还按钮 */}
        {step === 3 && uploadedUrl && (
          <TouchableOpacity
            style={[styles.confirmBtn, isSubmitting && styles.confirmBtnDisabled]}
            disabled={isSubmitting}
            onPress={handleConfirmReturn}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <>
                <Text style={styles.confirmBtnIcon}>✅</Text>
                <Text style={styles.confirmBtnText}>确认归还设备</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* 锁定提示 */}
        {step === 1 && (
          <View style={styles.lockedHint}>
            <Text style={styles.lockedIcon}>🔒</Text>
            <Text style={styles.lockedText}>归还按钮将在照片上传成功后解锁</Text>
          </View>
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

  // Header
  header: { marginBottom: theme.spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: theme.colors.text, marginBottom: 12 },
  assetCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  assetLabel: { fontSize: 14, color: theme.colors.gray, marginRight: theme.spacing.sm },
  assetName: { fontSize: 17, fontWeight: '700', color: theme.colors.text, flex: 1 },

  // Step Indicator
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
  stepActive: { backgroundColor: theme.colors.primary },
  stepDone: { backgroundColor: SUCCESS },
  stepNum: { fontSize: 14, fontWeight: '700', color: theme.colors.gray },
  stepNumActive: { color: theme.colors.background },
  stepCheckmark: { fontSize: 16, color: theme.colors.background, fontWeight: '800' },
  stepLabel: { fontSize: 11, color: theme.colors.gray, textAlign: 'center', maxWidth: 70 },
  stepLabelActive: { color: theme.colors.primary, fontWeight: '700' },
  stepLabelDone: { color: SUCCESS },
  stepLine: { flex: 1, height: 3, backgroundColor: '#E0E0E0', marginBottom: 20, marginHorizontal: 4, borderRadius: 2 },
  stepLineDone: { backgroundColor: SUCCESS },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'flex-start',
    gap: 12,
  },
  bannerIcon: { fontSize: 24, marginRight: 4 },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.primary, marginBottom: 4 },
  bannerText: { fontSize: 13, color: theme.colors.text, lineHeight: 20 },

  // Camera & Preview
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

  // URL Card
  urlCard: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 14,
    padding: 18,
    marginBottom: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: '#B2DFDB',
  },
  urlHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  urlIcon: { fontSize: 20 },
  urlTitle: { fontSize: 16, fontWeight: '700', color: SUCCESS },
  urlLabel: { fontSize: 13, color: theme.colors.text, marginBottom: 8, fontWeight: '600' },
  urlBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#B2DFDB',
    marginBottom: 10,
  },
  urlText: { fontSize: 12, color: '#007965', fontFamily: 'monospace', lineHeight: 18 },
  urlHint: { fontSize: 12, color: '#00695C', fontWeight: '600' },

  // Confirm Button
  confirmBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  confirmBtnDisabled: { backgroundColor: theme.colors.gray, shadowOpacity: 0 },
  confirmBtnIcon: { fontSize: 20 },
  confirmBtnText: { color: theme.colors.background, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },

  // Locked hint
  lockedHint: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.sm,
    opacity: 0.6,
  },
  lockedIcon: { fontSize: 16 },
  lockedText: { fontSize: 14, color: theme.colors.gray },
});
