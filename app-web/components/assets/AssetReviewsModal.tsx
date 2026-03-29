'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, Star, Loader2, MessageSquare, ChevronDown, ChevronUp,
  Send, MessageCircle, Inbox,
} from 'lucide-react';
import { getAssetReviews, getReviewReplies, postReviewReply } from '@/lib/assetService';
import { useToast } from '@/components/ui/Toast';
import type { ReviewWithName, ReplyWithAuthor } from '@/lib/assetService';
import { cn } from '@/lib/utils';

// ============================================================
// Constants. 常量
// ============================================================

const RATING_LABELS = ['Terrible', 'Poor', 'Average', 'Good', 'Excellent'];
const COLLAPSE_THRESHOLD = 3;

// Avatar background palette — consistent color per initial. 头像背景色板
const AVATAR_COLORS = [
  'bg-purple-500', 'bg-indigo-500', 'bg-sky-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ============================================================
// ReviewCard sub-component. 单条评价卡片子组件
// ============================================================

interface ReviewCardProps {
  review: ReviewWithName;
  currentUserId: string | null;
}

function ReviewCard({ review, currentUserId }: ReviewCardProps) {
  const { showToast } = useToast();
  const [replies, setReplies] = useState<ReplyWithAuthor[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchReplies = useCallback(async () => {
    setLoadingReplies(true);
    try {
      const data = await getReviewReplies(review.id);
      setReplies(data);
      setRepliesLoaded(true);
    } catch {
      // non-critical
    } finally {
      setLoadingReplies(false);
    }
  }, [review.id]);

  // 挂载时立即加载回复，确保回复数量徽标首次渲染就显示
  useEffect(() => { fetchReplies(); }, [fetchReplies]);

  const handleToggleReplies = () => setExpanded((v) => !v);

  const handleReplyClick = () => {
    setShowInput((v) => !v);
    setExpanded(true);
    // 下一帧聚焦输入框
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await postReviewReply(review.id, replyText.trim());
      setReplyText('');
      setShowInput(false);
      await fetchReplies();
      setExpanded(true);
      showToast('Reply posted.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to post reply.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleReplies = expanded ? replies : replies.slice(0, COLLAPSE_THRESHOLD);
  const hasMore = replies.length > COLLAPSE_THRESHOLD;
  const ratingLabel = RATING_LABELS[review.rating - 1] ?? 'Average';
  const initial = review.reviewer_name.charAt(0).toUpperCase();

  return (
    <div className="p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl space-y-3">
      {/* Header: avatar + name + stars + date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0', avatarColor(review.reviewer_name))}>
            {initial}
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none mb-1">{review.reviewer_name}</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600')} />
              ))}
              <span className="ml-1 text-xs font-medium text-yellow-400">{ratingLabel}</span>
            </div>
          </div>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0 mt-0.5">
          {review.created_at.slice(0, 10)}
        </span>
      </div>

      {/* Comment */}
      {review.comment ? (
        <p className="text-sm text-gray-200 leading-relaxed">"{review.comment}"</p>
      ) : (
        <p className="text-sm text-gray-500 italic">No comment provided.</p>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleReplyClick}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <MessageCircle size={13} />
          Reply
        </button>

        {loadingReplies && <Loader2 size={12} className="animate-spin text-gray-500" />}

        {repliesLoaded && replies.length > 0 && (
          <button
            onClick={handleToggleReplies}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide replies' : `View ${replies.length} repl${replies.length > 1 ? 'ies' : 'y'}`}
          </button>
        )}
      </div>

      {/* Reply input */}
      {showInput && (
        <div className="flex gap-2 items-end pt-1">
          <textarea
            ref={inputRef}
            rows={2}
            maxLength={500}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 text-sm bg-gray-900/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !replyText.trim()}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
          >
            {submitting ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} className="text-white" />}
          </button>
        </div>
      )}

      {/* Replies list */}
      {expanded && replies.length > 0 && (
        <div className="border-t border-gray-700/50 pt-3 space-y-2">
          {visibleReplies.map((reply) => (
            <div key={reply.id} className="flex gap-2.5 p-3 bg-gray-900/40 rounded-lg">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5', avatarColor(reply.author_name))}>
                {reply.author_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-indigo-300">
                    {reply.author_id === currentUserId ? 'You' : reply.author_name}
                    {reply.author_id === review.reviewer_id && (
                      <span className="ml-1.5 text-[10px] text-yellow-400 font-normal">(reviewer)</span>
                    )}
                  </span>
                  <span className="text-[10px] text-gray-600 flex-shrink-0">{reply.created_at.slice(0, 10)}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{reply.content}</p>
              </div>
            </div>
          ))}

          {hasMore && expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="w-full flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              <ChevronUp size={13} />
              Collapse
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Modal. 弹窗
// ============================================================

interface AssetReviewsModalProps {
  assetId: string;
  assetName: string;
  onClose: () => void;
}

export default function AssetReviewsModal({ assetId, assetName, onClose }: AssetReviewsModalProps) {
  const [reviews, setReviews] = useState<ReviewWithName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
    });

    getAssetReviews(assetId)
      .then(setReviews)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [assetId]);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Device Reviews
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400">{assetName}</p>
              {avgRating && (
                <>
                  <span className="text-gray-600">·</span>
                  <span className="flex items-center gap-1 text-xs text-yellow-400 font-semibold">
                    <Star className="w-3 h-3 fill-yellow-400" />
                    {avgRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
              <p className="mt-3 text-sm text-gray-500">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="w-12 h-12 text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-400">No reviews yet</p>
              <p className="text-xs text-gray-600 mt-1">This asset hasn't received any feedback.</p>
            </div>
          ) : (
            reviews.map((review) => (
              <ReviewCard key={review.id} review={review} currentUserId={currentUserId} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
