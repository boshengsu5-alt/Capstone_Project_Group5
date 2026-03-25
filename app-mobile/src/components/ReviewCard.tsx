import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { getReviewReplies, postReviewReply } from '../services/assetService';
import type { Review, ReviewReply } from '../../../database/types/supabase';

export type ReviewWithMeta = Review & { reviewer_name: string };
type ReplyWithAuthor = ReviewReply & { author_name: string };

const COLLAPSE_THRESHOLD = 3;

interface ReviewCardProps {
  review: ReviewWithMeta;
  currentUserId?: string;
}

export default function ReviewCard({ review, currentUserId }: ReviewCardProps) {
  const [replies, setReplies] = useState<ReplyWithAuthor[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ratingLabel = ['极差', '不太理想', '中规中矩', '很好', '非常好'][review.rating - 1];

  // 抽出纯粹的「获取回复」函数，不做任何 repliesLoaded 判断，避免闭包陷阱
  const fetchReplies = useCallback(async () => {
    setLoadingReplies(true);
    try {
      const data = await getReviewReplies(review.id);
      setReplies(data);
      setRepliesLoaded(true);
    } catch (err) {
      console.error('[ReviewCard] 加载回复失败:', err);
    } finally {
      setLoadingReplies(false);
    }
  }, [review.id]);

  // 挂载时立即加载回复，确保「查看 N 条回复」按钮首次渲染就显示
  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  // 懒加载：只在首次调用时请求（供手动触发用）
  const loadRepliesOnce = useCallback(async () => {
    if (repliesLoaded) return;
    await fetchReplies();
  }, [repliesLoaded, fetchReplies]);

  const handleToggleReplies = async () => {
    await loadRepliesOnce();
    setExpanded(prev => !prev);
  };

  const handleReplyPress = async () => {
    await loadRepliesOnce();
    setShowReplyInput(prev => !prev);
    setExpanded(true);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await postReviewReply(review.id, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
      // 直接调用 fetchReplies，不依赖 repliesLoaded 状态
      await fetchReplies();
      setExpanded(true);
    } catch (err: unknown) {
      Alert.alert('发送失败', err instanceof Error ? err.message : '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleReplies = expanded ? replies : replies.slice(0, COLLAPSE_THRESHOLD);
  const hasMore = replies.length > COLLAPSE_THRESHOLD;

  return (
    <View style={styles.card}>
      {/* 评价头部：头像 + 用户名 + 星级 + 日期 */}
      <View style={styles.cardHeader}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {review.reviewer_name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.username}>{review.reviewer_name}</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <Ionicons
                  key={i}
                  name={i <= review.rating ? 'star' : 'star-outline'}
                  size={13}
                  color={i <= review.rating ? '#FBBF24' : theme.colors.gray}
                />
              ))}
              <Text style={styles.ratingLabel}>{ratingLabel}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.date}>{review.created_at.slice(0, 10)}</Text>
      </View>

      {/* 评价内容 */}
      {review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}

      {/* 操作栏 */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.replyBtn} onPress={handleReplyPress}>
          <Ionicons name="chatbubble-outline" size={14} color={theme.colors.gray} />
          <Text style={styles.replyBtnText}>追问 / 回复</Text>
        </TouchableOpacity>

        {loadingReplies && (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 8 }} />
        )}

        {/* 未展开时显示「查看 N 条回复」 */}
        {repliesLoaded && replies.length > 0 && !expanded && (
          <TouchableOpacity style={styles.expandBtn} onPress={handleToggleReplies}>
            <Text style={styles.expandText}>查看 {replies.length} 条回复</Text>
            <Ionicons name="chevron-down" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 回复输入框 */}
      {showReplyInput && (
        <View style={styles.replyInputRow}>
          <TextInput
            style={styles.replyInput}
            placeholder="写下你的追问或回复..."
            placeholderTextColor={theme.colors.gray}
            value={replyText}
            onChangeText={setReplyText}
            maxLength={500}
            multiline
            autoFocus
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!replyText.trim() || submitting) && styles.sendBtnDisabled]}
            onPress={handleSubmitReply}
            disabled={!replyText.trim() || submitting}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={16} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      )}

      {/* 回复列表 */}
      {expanded && replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {visibleReplies.map(reply => (
            <View key={reply.id} style={styles.replyItem}>
              <View style={styles.replyHeader}>
                <Text style={styles.replyAuthor}>
                  {reply.author_id === currentUserId ? '我' : reply.author_name}
                  {reply.author_id === review.reviewer_id
                    ? <Text style={styles.reviewerTag}> [评价者]</Text>
                    : null}
                </Text>
                <Text style={styles.replyDate}>{reply.created_at.slice(0, 10)}</Text>
              </View>
              <Text style={styles.replyContent}>{reply.content}</Text>
            </View>
          ))}

          {/* 超过 3 条时显示「查看更多」或「收起」 */}
          {hasMore && !expanded ? null : hasMore && expanded ? (
            <TouchableOpacity style={styles.collapseBtn} onPress={() => setExpanded(false)}>
              <Ionicons name="chevron-up" size={14} color={theme.colors.gray} />
              <Text style={styles.collapseText}>收起回复</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  username: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 3,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingLabel: {
    fontSize: 11,
    color: '#FBBF24',
    fontWeight: '600',
    marginLeft: 4,
  },
  date: {
    fontSize: 12,
    color: theme.colors.gray,
  },
  comment: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 21,
    marginBottom: 10,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyBtnText: {
    fontSize: 13,
    color: theme.colors.gray,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.gray,
  },
  repliesContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    paddingTop: 10,
    gap: 8,
  },
  replyItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  reviewerTag: {
    fontSize: 11,
    color: '#FBBF24',
    fontWeight: '600',
  },
  replyContent: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 19,
  },
  replyDate: {
    fontSize: 11,
    color: theme.colors.gray,
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  collapseText: {
    fontSize: 13,
    color: theme.colors.gray,
  },
});
