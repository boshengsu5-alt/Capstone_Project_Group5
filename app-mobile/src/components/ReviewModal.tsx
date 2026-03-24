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
} from 'react-native';
import { alertManager } from '../utils/alertManager';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { submitReview } from '../services/bookingService';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  assetName: string;
  onSuccess: () => void;
}

export default function ReviewModal({
  visible,
  onClose,
  bookingId,
  assetName,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 每次关闭弹窗后重置状态，下次打开时不会残留上次的评分和评论
  React.useEffect(() => {
    if (!visible) {
      setRating(5);
      setComment('');
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await submitReview(bookingId, rating, comment);
      alertManager.alert('评价成功', '感谢您的反馈！');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '系统繁忙，请稍后再试';
      alertManager.alert('评价失败', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
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
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.title}>设备评价</Text>
                <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
                  <Ionicons name="close" size={24} color={theme.colors.gray} />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                <Text style={styles.assetName}>正在为「{assetName}」进行评价</Text>
                
                {renderStars()}
                
                <Text style={styles.ratingText}>
                  {rating === 5 ? '非常好' : rating === 4 ? '很好' : rating === 3 ? '中规中矩' : rating === 2 ? '不太理想' : '极差'}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="写下您的使用感受（可选）"
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
                    <Text style={styles.submitBtnText}>提交评价</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
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
