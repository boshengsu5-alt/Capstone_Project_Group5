import React, { useState } from 'react';
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
import { submitDamageReport } from '../../services/bookingService';
import { getCurrentUser } from '../../services/authService';
import { uploadFile } from '../../services/storageService';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import type { DamageSeverity } from '../../../../database/types/supabase';
import { theme } from '../../theme';

type DamageReportRouteProp = RouteProp<BookingsStackParamList, 'DamageReport'>;

// 严重程度配置 (Severity Options)
const SEVERITY_OPTIONS: { value: DamageSeverity; label: string; emoji: string; color: string }[] = [
  { value: 'minor',    label: '轻微损坏', emoji: '🟡', color: '#F59E0B' },
  { value: 'moderate', label: '中度损坏', emoji: '🟠', color: '#F97316' },
  { value: 'severe',   label: '严重损坏', emoji: '🔴', color: theme.colors.danger },
];

export default function DamageReportScreen() {
  const route = useRoute<DamageReportRouteProp>();
  const navigation = useNavigation();
  const { assetId, bookingId } = route.params;

  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<DamageSeverity>('minor');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 选择照片（相册 or 相机）
  const handleAddPhoto = () => {
    alertManager.alert('添加损坏照片', '请选择来源', [
      {
        text: '拍摄照片',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            alertManager.alert('权限不足', '需要相机权限才能拍照');
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
        text: '从相册选择',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            alertManager.alert('权限不足', '需要相册权限才能选取照片');
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
      { text: '取消', style: 'cancel' },
    ]);
  };

  const addCompressedPhoto = async (uri: string) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    setPhotoUris(prev => [...prev, manipResult.uri]);
  };

  const removePhoto = (index: number) => {
    setPhotoUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (description.trim().length < 10) {
      alertManager.alert('描述太短', '请至少用10个字描述损坏情况');
      return;
    }
    if (photoUris.length === 0) {
      alertManager.alert('缺少照片', '请上传至少一张损坏区域照片');
      return;
    }

    setSubmitting(true);
    try {
      // 通过 service 层获取当前用户，不直接调用 supabase
      const user = await getCurrentUser();

      // 上传所有照片
      const uploadedUrls: string[] = [];
      for (const uri of photoUris) {
        const fileExt = uri.split('.').pop() || 'jpg';
        const fileName = `${user.id}/damage_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const url = await uploadFile('damage-photos', uri, fileName);
        uploadedUrls.push(url);
      }

      // 提交损坏报告
      await submitDamageReport(assetId, bookingId, description.trim(), severity, uploadedUrls);

      alertManager.alert(
        '报修单已提交',
        '感谢您的反馈！老师将在 1-2 个工作日内核验，信用分结果届时通知。',
        [{ text: '好的', onPress: () => navigation.goBack() }]
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '网络错误，请稍后重试';
      alertManager.alert('提交失败', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* 报修设备信息卡 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 报修信息</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>借用单号</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{bookingId.slice(0, 8)}…</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>设备 ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{assetId.slice(0, 8)}…</Text>
            </View>
          </View>
        </View>

        {/* 严重程度选择 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ 损坏程度</Text>
          <View style={styles.severityRow}>
            {SEVERITY_OPTIONS.map(opt => (
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
          <Text style={styles.sectionTitle}>📝 情况描述（至少 10 字）</Text>
          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={6}
            placeholder="请详细描述设备损坏情况，例如：镜头前镜片碎裂，缝隙处有明显玻璃碎片，无法正常对焦……"
            placeholderTextColor={theme.colors.gray}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, description.length < 10 && styles.charCountWarn]}>
            {description.length} / 10 字最低要求
          </Text>
        </View>

        {/* 损坏照片 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 损坏区域照片（必填）</Text>

          <View style={styles.photoGrid}>
            {photoUris.map((uri, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(index)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photoUris.length < 5 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto} activeOpacity={0.7}>
                <Text style={styles.addPhotoBtnIcon}>＋</Text>
                <Text style={styles.addPhotoBtnText}>添加照片</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.photoHint}>最多 5 张 · 照片将上传至学校证据库</Text>
        </View>

        {/* 提交按钮 */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.submitText}>提交客诉单</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          提交后将由老师人工核验，可能影响信用分。确认属实再提交。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, paddingBottom: 40 },

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

  severityRow: { flexDirection: 'row', gap: 10 },
  severityChip: {
    flex: 1,
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

  disclaimer: { textAlign: 'center', fontSize: 12, color: theme.colors.gray, lineHeight: 18 },
});
