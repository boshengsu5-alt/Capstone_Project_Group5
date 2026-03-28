import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { alertManager } from '../../utils/alertManager';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { getCurrentUser, getMyProfile, updateMyProfile } from '../../services/authService';
import { uploadFile } from '../../services/storageService';
import { handleApiError } from '../../utils/errorHandler';
import { ProfileStackParamList } from '../../navigation/ProfileStackNavigator';
import type { Profile } from '../../../../database/types/supabase';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;
};

function roleLabelKey(role: Profile['role']) {
  if (role === 'admin') return 'editProfile.roleAdmin';
  if (role === 'staff') return 'editProfile.roleStaff';
  return 'editProfile.roleStudent';
}

function toInlineAvatarDataUri(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
}

export default function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const data = await getMyProfile();
        if (cancelled) return;

        const nextProfile = data as Profile;
        setProfile(nextProfile);
        setFullName(nextProfile.full_name ?? '');
        setPhone(nextProfile.phone ?? '');
        setStudentId(nextProfile.student_id ?? '');
        setDepartment(nextProfile.department ?? '');
        setAvatarUri(nextProfile.avatar_url ?? '');
        setAvatarBase64(null);
      } catch (err: unknown) {
        handleApiError(err, t('editProfile.loadFailed'));
        if (!cancelled) navigation.goBack();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [navigation, t]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;

    return (
      fullName.trim() !== (profile.full_name ?? '').trim()
      || phone.trim() !== (profile.phone ?? '').trim()
      || studentId.trim() !== (profile.student_id ?? '').trim()
      || department.trim() !== (profile.department ?? '').trim()
      || avatarUri !== (profile.avatar_url ?? '')
    );
  }, [avatarUri, department, fullName, phone, profile, studentId]);

  const prepareAvatar = async (uri: string) => {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 512, height: 512 } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    setAvatarUri(result.uri);
    setAvatarBase64(result.base64 ?? null);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alertManager.alert(t('profile.prompt'), t('editProfile.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      await prepareAvatar(result.assets[0].uri);
    }
  };

  const openLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alertManager.alert(t('profile.prompt'), t('editProfile.libraryPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      await prepareAvatar(result.assets[0].uri);
    }
  };

  const handleChangeAvatar = () => {
    alertManager.alert(t('editProfile.avatarSourceTitle'), t('editProfile.avatarSourceMessage'), [
      { text: t('editProfile.takePhoto'), onPress: () => void openCamera() },
      { text: t('editProfile.chooseFromLibrary'), onPress: () => void openLibrary() },
      { text: t('profile.cancel'), style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!profile) return;

    if (!fullName.trim()) {
      alertManager.alert(t('profile.prompt'), t('editProfile.nameRequired'));
      return;
    }

    setSaving(true);
    try {
      let nextAvatarUrl = profile.avatar_url ?? '';
      let usedInlineAvatarFallback = false;

      if (avatarBase64 && avatarUri) {
        try {
          const user = await getCurrentUser();
          const fileName = `${user.id}/avatar_${Date.now()}.jpg`;
          nextAvatarUrl = await uploadFile('avatars', avatarUri, fileName, avatarBase64);
        } catch (error) {
          // 某些环境还没创建 avatars bucket。此时退回到 data URI，
          // 先保证“编辑资料”页面可保存，后续补齐 storage migration 后会继续走正式上传。
          nextAvatarUrl = toInlineAvatarDataUri(avatarBase64);
          usedInlineAvatarFallback = true;
        }
      }

      const updated = await updateMyProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        student_id: studentId.trim() || null,
        department: department.trim(),
        avatar_url: nextAvatarUrl,
      });

      setProfile(updated);
      setAvatarUri(updated.avatar_url ?? nextAvatarUrl);
      setAvatarBase64(null);
      alertManager.alert(
        t('editProfile.successTitle'),
        usedInlineAvatarFallback
          ? t('editProfile.successMessageWithAvatarFallback')
          : t('editProfile.successMessage'),
        [{ text: t('editProfile.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (err: unknown) {
      handleApiError(err, t('editProfile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={36} color="#fff" />
              </View>
            )}

            <TouchableOpacity style={styles.avatarButton} onPress={handleChangeAvatar}>
              <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.avatarButtonText}>{t('editProfile.changeAvatar')}</Text>
            </TouchableOpacity>

            <Text style={styles.heroHint}>{t('editProfile.avatarHint')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('editProfile.basicInfo')}</Text>

            <View style={styles.field}>
              <Text style={styles.label}>{t('editProfile.fullName')}</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t('editProfile.fullNamePlaceholder')}
                placeholderTextColor={theme.colors.gray}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('editProfile.phone')}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('editProfile.phonePlaceholder')}
                placeholderTextColor={theme.colors.gray}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('editProfile.academicInfo')}</Text>

            <View style={styles.field}>
              <Text style={styles.label}>{t('editProfile.studentId')}</Text>
              <TextInput
                style={styles.input}
                value={studentId}
                onChangeText={setStudentId}
                placeholder={t('editProfile.studentIdPlaceholder')}
                placeholderTextColor={theme.colors.gray}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('editProfile.department')}</Text>
              <TextInput
                style={styles.input}
                value={department}
                onChangeText={setDepartment}
                placeholder={t('editProfile.departmentPlaceholder')}
                placeholderTextColor={theme.colors.gray}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('editProfile.accountInfo')}</Text>

            <View style={styles.readOnlyCard}>
              <View style={styles.readOnlyRow}>
                <Text style={styles.label}>{t('editProfile.email')}</Text>
                <Text style={styles.readOnlyValue}>{profile?.email ?? ''}</Text>
              </View>
              <View style={styles.readOnlyDivider} />
              <View style={styles.readOnlyRow}>
                <Text style={styles.label}>{t('editProfile.role')}</Text>
                <Text style={styles.readOnlyValue}>
                  {profile ? t(roleLabelKey(profile.role)) : ''}
                </Text>
              </View>
            </View>
            <Text style={styles.readOnlyHint}>{t('editProfile.readOnlyHint')}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasChanges || saving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t('editProfile.save')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  flex: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: theme.spacing.md,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: theme.spacing.sm,
  },
  avatarButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  heroHint: {
    fontSize: 12,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  readOnlyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  readOnlyRow: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  readOnlyDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginHorizontal: theme.spacing.md,
  },
  readOnlyValue: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500',
  },
  readOnlyHint: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
