import { supabase } from './supabase';
import { getCurrentUser } from './authService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============================================================
// Notification Service — 通知服务
// ============================================================

/**
 * Get current user's notifications ordered by newest first.
 * 获取当前用户的所有通知（最新在前）
 *
 * @returns Array of Notification rows. 通知记录数组
 */
export async function getMyNotifications() {
  const user = await getCurrentUser();

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Mark a single notification as read.
 * 将单条通知标记为已读
 *
 * @param notificationId - UUID of the notification. 通知 ID
 */
export async function markNotificationAsRead(notificationId: string) {
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Mark all current user's notifications as read.
 * 将当前用户的所有通知标记为已读
 */
export async function markAllNotificationsAsRead() {
  const user = await getCurrentUser();

  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
}
