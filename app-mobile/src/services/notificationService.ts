import { supabase } from './supabase';
import { getCurrentUser } from './authService';
import type { Notification } from '../../../database/types/supabase';

// 手写 Database 类型与 Supabase 客户端泛型不完全兼容，
// 用 db 别名统一绕过类型推断问题，运行时行为不受影响
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============================================================
// Notification Service — 通知服务
// ============================================================

/**
 * Get all notifications for the current user, ordered by most recent.
 * 获取当前用户的所有通知，按最新排序
 *
 * @returns Array of notification records. 通知记录数组
 */
export async function getMyNotifications(): Promise<Notification[]> {
  const user = await getCurrentUser();

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Notification[];
}

/**
 * Get unread notification count for the current user.
 * 获取当前用户的未读通知数量
 *
 * @returns Unread count. 未读数量
 */
export async function getUnreadCount(): Promise<number> {
  const user = await getCurrentUser();

  const { count, error } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Mark a single notification as read.
 * 将单条通知标记为已读
 *
 * @param notificationId - Notification UUID to mark. 要标记的通知 ID
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read for the current user.
 * 将当前用户的所有通知标记为已读
 */
export async function markAllAsRead(): Promise<void> {
  const user = await getCurrentUser();

  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
}

/**
 * Subscribe to new notifications for the current user via Supabase Realtime.
 * Returns an unsubscribe function to be called on component unmount.
 * 通过 Supabase Realtime 订阅当前用户的新通知 INSERT 事件。
 * 返回取消订阅函数，在组件卸载时调用。
 *
 * @param onNew - Callback fired with the new notification payload. 收到新通知时触发的回调
 * @returns Unsubscribe function. 取消订阅函数
 */
export async function subscribeToNotifications(
  onNew: (notification: Notification) => void
): Promise<() => void> {
  const user = await getCurrentUser();

  // 用 user_id 过滤，只收到属于当前用户的通知推送
  // Filter by user_id so each client only receives its own notifications
  const channel = supabase
    .channel(`notifications:${user.id}`)
    .on(
      'postgres_changes' as any,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      },
      (payload: any) => {
        onNew(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
