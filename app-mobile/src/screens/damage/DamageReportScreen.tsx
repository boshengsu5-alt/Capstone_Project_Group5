import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { alertManager } from '../../utils/alertManager';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { BookingsStackParamList } from '../../navigation/BookingsStackNavigator';
import { getMyDamageReportByBookingId, submitDamageReport, withdrawOwnDamageReport } from '../../services/bookingService';
import { getCurrentUser } from '../../services/authService';
import { uploadFile } from '../../services/storageService';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import type { DamageSeverity } from '../../../../database/types/supabase';
import { theme } from '../../theme';
import { getDisplayErrorMessage } from '../../utils/errorHandler';
import { useTranslation } from 'react-i18next';

type DamageReportRouteProp = RouteProp<BookingsStackParamList, 'DamageReport'>;

export default function DamageReportScreen() {
  const { t } = useTranslation();
  const route = useRoute<DamageReportRouteProp>();
  const navigation = useNavigation();
  const { assetId, bookingId, mode } = route.params;
  const severityOptions: { value: DamageSeverity; label: string; emoji: string; color: string }[] = [
    { value: 'minor', label: t('damageReport.severity.minor'), emoji: '🟡', color: '#F59E0B' },
    { value: 'moderate', label: t('damageReport.severity.moderate'), emoji: '🟠', color: '#F97316' },
    { value: 'severe', label: t('damageReport.severity.severe'), emoji: '🔴', color: theme.colors.danger },
    { value: 'lost', label: t('damageReport.severity.lost'), emoji: '❌', color: '#991B1B' },
  ];

  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<DamageSeverity>('minor');
  const [photoUris, setPhotoUris] = useState<Array<{ uri: string; uploaded: boolean }>>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    const loadExistingReport = async () => {
      try {
        const existingReport = await getMyDamageReportByBookingId(bookingId);

        if (existingReport) {
          setReportId(existingReport.id);
          setDescription(existingReport.description ?? '');
          setSeverity(existingReport.severity);
          setPhotoUris((existingReport.photo_urls ?? []).map((uri) => ({ uri, uploaded: true })));
          setIsEditing(existingReport.status === 'open' || existingReport.status === 'investigating');

          if (existingReport.status !== 'open' && existingReport.status !== 'investigating') {
            alertManager.alert(t('damageReport.duplicateTitle'), t('damageReport.duplicateMessage'));
          }
        } else {
          setReportId(null);
          setIsEditing(false);
        }
      } catch (error: unknown) {
        const message = getDisplayErrorMessage(error) || t('damageReport.loadFailedMessage');
        alertManager.alert(t('damageReport.loadFailedTitle'), message);
      } finally {
        setLoadingExisting(false);
      }
    };

    loadExistingReport();
  }, [bookingId, mode]);

  // 选择照片（相册 or 相机）
  // AppAlert 现已通过 onDismiss（iOS）/ setTimeout（Android）确保 Modal 完全消失后
  // 再调用 onPress，可安全唤起原生相机/相册，无需再用原生 Alert.alert。
  const handleAddPhoto = () => {
    alertManager.alert(t('damageReport.addPhotoTitle'), t('damageReport.addPhotoMessage'), [
      {
        text: t('damageReport.takePhoto'),
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            alertManager.alert(t('damageReport.permissionDeniedTitle'), t('damageReport.cameraPermissionMessage'));
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
          });
          if (!result.canceled && result.assets.length > 0) {
            await addCompressedPhoto(result.assets[0].uri);
          }
        },
      },
      {
        text: t('damageReport.chooseFromLibrary'),
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            alertManager.alert(t('damageReport.permissionDeniedTitle'), t('damageReport.libraryPermissionMessage'));
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 0.8,
          });
          if (!result.canceled) {
            for (const item of result.assets) {
              await addCompressedPhoto(item.uri);
            }
          }
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const addCompressedPhoto = async (uri: string) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    setPhotoUris(prev => [...prev, { uri: manipResult.uri, uploaded: false }]);
  };

  const removePhoto = (index: number) => {
    setPhotoUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (description.trim().length < 10) {
      alertManager.alert(t('damageReport.descriptionTooShortTitle'), t('damageReport.descriptionTooShortMessage'));
      return;
    }
    // 丢失情况无法拍照，照片为可选；其他损坏类型必须提供照片作为证据
    if (severity !== 'lost' && photoUris.length === 0) {
      alertManager.alert(t('damageReport.missingPhotoTitle'), t('damageReport.missingPhotoMessage'));
      return;
    }
    if (mode === 'edit' && !isEditing) {
      alertManager.alert(t('damageReport.cannotEditTitle'), t('damageReport.cannotEditMessage'));
      return;
    }

    setSubmitting(true);
    try {
      // 通过 service 层获取当前用户，不直接调用 supabase
      const user = await getCurrentUser();

      // 上传所有照片
      const uploadedUrls: string[] = [];
      for (const photo of photoUris) {
        if (photo.uploaded) {
          uploadedUrls.push(photo.uri);
          continue;
        }

        const fileExt = photo.uri.split('.').pop() || 'jpg';
        const fileName = `${user.id}/damage_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const url = await uploadFile('damage-photos', photo.uri, fileName);
        uploadedUrls.push(url);
      }

      // 提交损坏报告
      await submitDamageReport(assetId, bookingId, description.trim(), severity, uploadedUrls);

      alertManager.alert(
        isEditing ? t('damageReport.updatedTitle') : t('damageReport.submittedTitle'),
        severity === 'lost'
          ? (isEditing
              ? t('damageReport.updatedLostMessage')
              : t('damageReport.submittedLostMessage'))
          : (isEditing
              ? t('damageReport.updatedMessage')
              : t('damageReport.submittedMessage')),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (err: unknown) {
      const message = getDisplayErrorMessage(err) || t('damageReport.networkError');
      alertManager.alert(t('damageReport.submitFailedTitle'), message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = () => {
    if (!reportId || !isEditing) {
      alertManager.alert(t('damageReport.cannotEditTitle'), t('damageReport.cannotEditMessage'));
      return;
    }

    alertManager.alert(
      t('damageReport.withdrawConfirmTitle'),
      t('damageReport.withdrawConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('damageReport.withdrawConfirmAction'),
          style: 'destructive',
          onPress: async () => {
            setWithdrawing(true);
            try {
              await withdrawOwnDamageReport(reportId);
              alertManager.alert(
                t('damageReport.withdrawnTitle'),
                t('damageReport.withdrawnMessage'),
                [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
              );
            } catch (error: unknown) {
              const message = getDisplayErrorMessage(error) || t('damageReport.networkError');
              alertManager.alert(t('damageReport.withdrawFailedTitle'), message);
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  if (loadingExisting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('damageReport.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {isEditing && (
          <View style={styles.editBanner}>
            <Text style={styles.editBannerTitle}>{t('damageReport.editBannerTitle')}</Text>
            <Text style={styles.editBannerText}>
              {severity === 'lost'
                ? t('damageReport.editLostBannerText')
                : t('damageReport.editBannerText')}
            </Text>
          </View>
        )}

        {/* 报修设备信息卡 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('damageReport.infoSection')}</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('damageReport.bookingId')}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{bookingId.slice(0, 8)}…</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('damageReport.assetId')}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{assetId.slice(0, 8)}…</Text>
            </View>
          </View>
        </View>

        {/* 严重程度选择 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('damageReport.severitySection')}</Text>
          <View style={styles.severityRow}>
            {severityOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.severityChip,
                  severity === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
                ]}
                onPress={() => setSeverity(opt.value)}
                activeOpacity={0.75}
              >
                <Text style={styles.severityEmoji}>{opt.emoji}</Text>
                <Text style={[styles.severityLabel, severity === opt.value && styles.severityLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 文字描述 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('damageReport.descriptionSection')}</Text>
          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={6}
            placeholder={t('damageReport.descriptionPlaceholder')}
            placeholderTextColor={theme.colors.gray}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, description.length < 10 && styles.charCountWarn]}>
            {t('damageReport.charCount', { count: description.length })}
          </Text>
        </View>

        {/* 损坏照片 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('damageReport.photoSection', {
              requirement: severity === 'lost' ? t('damageReport.photoOptional') : t('damageReport.photoRequired'),
            })}
          </Text>

          <View style={styles.photoGrid}>
            {photoUris.map((uri, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: uri.uri }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(index)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photoUris.length < 5 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto} activeOpacity={0.7}>
                <Text style={styles.addPhotoBtnIcon}>＋</Text>
                <Text style={styles.addPhotoBtnText}>{t('damageReport.addPhoto')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.photoHint}>{t('damageReport.photoHint')}</Text>
        </View>

        {/* 提交按钮 */}
        <TouchableOpacity
          style={[styles.submitButton, (submitting || withdrawing) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || withdrawing}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.submitText}>{isEditing ? t('damageReport.submitUpdate') : t('damageReport.submitCreate')}</Text>
          )}
        </TouchableOpacity>

        {isEditing && reportId && (
          <TouchableOpacity
            style={[styles.withdrawButton, (submitting || withdrawing) && styles.withdrawButtonDisabled]}
            onPress={handleWithdraw}
            disabled={submitting || withdrawing}
            activeOpacity={0.8}
          >
            {withdrawing ? (
              <ActivityIndicator color={theme.colors.danger} />
            ) : (
              <Text style={styles.withdrawButtonText}>{t('damageReport.withdrawButton')}</Text>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          {t('damageReport.disclaimer')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, paddingBottom: 40 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  editBanner: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  editBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C2410C',
    marginBottom: 4,
  },
  editBannerText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#9A3412',
  },

  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },

  infoCard: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: theme.spacing.md,
    gap: 8,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: theme.colors.gray },
  infoValue: { fontSize: 13, color: theme.colors.text, fontWeight: '600', maxWidth: '70%' },

  // 4 个选项排 2×2 网格，flexWrap 自动换行
  severityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  severityChip: {
    // 每行两个，gap=10，总宽 = (container - 2*padding - gap) / 2
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.inputBackground,
    backgroundColor: theme.colors.background,
  },
  severityEmoji: { fontSize: 22, marginBottom: 4 },
  severityLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.gray },
  severityLabelActive: { color: theme.colors.background },

  textInput: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: theme.colors.text,
    minHeight: 130,
    lineHeight: 22,
  },
  charCount: { marginTop: 6, fontSize: 12, color: '#4CAF50', textAlign: 'right' },
  charCountWarn: { color: '#F59E0B' },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrapper: { width: 90, height: 90, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: theme.colors.background, fontSize: 11, fontWeight: 'bold' },
  addPhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C7BFF0',
    borderStyle: 'dashed',
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtnIcon: { fontSize: 24, color: theme.colors.primary, lineHeight: 28 },
  addPhotoBtnText: { fontSize: 11, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
  photoHint: { marginTop: 8, fontSize: 12, color: theme.colors.gray },

  submitButton: {
    backgroundColor: theme.colors.danger,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: theme.colors.danger,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: theme.colors.background, fontSize: 17, fontWeight: '700' },
  withdrawButton: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  withdrawButtonDisabled: { opacity: 0.5 },
  withdrawButtonText: { color: theme.colors.danger, fontSize: 16, fontWeight: '700' },

  disclaimer: { textAlign: 'center', fontSize: 12, color: theme.colors.gray, lineHeight: 18 },
});
