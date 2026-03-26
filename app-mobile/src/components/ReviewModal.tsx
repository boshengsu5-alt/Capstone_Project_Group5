import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { alertManager } from '../utils/alertManager';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { submitReview, updateReview } from '../services/bookingService';
import type { Review } from '../../../database/types/supabase';
import { useTranslation } from 'react-i18next';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  assetName: string;
  onSuccess: () => void;
  /** 传入已有评价时进入编辑模式。Pass existing review to enable edit mode. */
  existingReview?: Review | null;
}

export default function ReviewModal({
  visible,
  onClose,
  bookingId,
  assetName,
  onSuccess,
  existingReview,
}: ReviewModalProps) {
  const { t } = useTranslation();
  const isEditMode = !!existingReview;

  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 每次弹窗显示时同步外部传入的初始值
  React.useEffect(() => {
    if (visible) {
      setRating(existingReview?.rating ?? 5);
      setComment(existingReview?.comment ?? '');
      setIsSubmitting(false);
    }
  }, [visible, existingReview]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isEditMode && existingReview) {
        await updateReview(existingReview.id, rating, comment);
        alertManager.alert(t('review.editSuccess'), t('review.editSuccessMsg'));
      } else {
        await submitReview(bookingId, rating, comment);
        alertManager.alert(t('review.submitSuccess'), t('review.submitSuccessMsg'));
      }
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('review.systemBusy');
      alertManager.alert(isEditMode ? t('review.editFailed') : t('review.submitFailed'), msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingLabel = (t('review.ratingLabels', { returnObjects: true }) as string[])[rating - 1];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* 点击背景关闭键盘 */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* KeyboardAvoidingView 包住弹窗主体，键盘弹出时整体上移 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <View style={styles.container}>
          {/* 顶部标题栏 */}
          <View style={styles.header}>
            <Text style={styles.title}>{isEditMode ? t('review.editReviewTitle') : t('review.addReviewTitle')}</Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <Ionicons name="close" size={24} color={theme.colors.gray} />
            </TouchableOpacity>
          </View>

          {/* ScrollView 保证小屏也能滚动看到提交按钮 */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={styles.content}>
              <Text style={styles.assetName}>
                {isEditMode
                  ? t('review.editReviewSubtitle', { asset: assetName })
                  : t('review.addReviewSubtitle', { asset: assetName })}
              </Text>

              {/* 星级选择 */}
              <View style={styles.starContainer}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setRating(i)}
                    disabled={isSubmitting}
                  >
                    <Ionicons
                      name={i <= rating ? 'star' : 'star-outline'}
                      size={40}
                      color={i <= rating ? '#FBBF24' : theme.colors.gray}
                      style={styles.star}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.ratingText}>{ratingLabel}</Text>

              <TextInput
                style={styles.input}
                placeholder={isEditMode ? t('review.editPlaceholder') : t('review.addPlaceholder')}
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
                editable={!isSubmitting}
              />

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {isEditMode ? t('review.saveChanges') : t('review.submitReview')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // 半透明遮罩层（绝对定位铺满）
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  // KeyboardAvoidingView 居底对齐，弹窗从底部弹出
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34, // 底部安全区兜底
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  content: {
    alignItems: 'center',
  },
  assetName: {
    fontSize: 16,
    color: theme.colors.gray,
    marginBottom: 20,
    textAlign: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  star: {
    marginHorizontal: 5,
  },
  ratingText: {
    fontSize: 14,
    color: '#FBBF24',
    fontWeight: '700',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: theme.colors.gray,
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
