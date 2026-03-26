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
 * Check active bookings and insert return_reminder notifications for those due within 2 days.
 * Deduplicates: skips if a reminder for the same booking was already sent within 23 hours.
 * 检查 active 借用，对 2 天内到期的插入归还提醒通知。
 * 去重：同一笔借用 23 小时内已发过提醒则跳过。
 *
 * Call this silently (fire-and-forget) when the user opens BookingHistoryScreen.
 * 在用户打开借用记录页时静默调用（无需 await）。
 */
export async function checkAndSendReturnReminders(): Promise<void> {
  const user = await getCurrentUser();

  // 拉取所有 active 借用及其到期日
  const { data: bookings, error: bookErr } = await db
    .from('bookings')
    .select('id, end_date, assets(name)')
    .eq('borrower_id', user.id)
    .eq('status', 'active');

  if (bookErr || !bookings || bookings.length === 0) return;

  // 拉取过去 23 小时内该用户收到的所有 return_reminder，用于去重
  const dedupeWindow = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
  const { data: recentReminders } = await db
    .from('notifications')
    .select('metadata')
    .eq('user_id', user.id)
    .eq('type', 'return_reminder')
    .gte('created_at', dedupeWindow);

  // 已提醒过的 booking_id 集合
  const remindedIds = new Set<string>(
    ((recentReminders ?? []) as { metadata: { booking_id?: string } }[])
      .map(n => n.metadata?.booking_id)
      .filter((id): id is string => Boolean(id))
  );

  const now = new Date();

  for (const booking of bookings as { id: string; end_date: string; assets: { name: string } | null }[]) {
    // 跳过已提醒过的
    if (remindedIds.has(booking.id)) continue;

    const endDate = new Date(booking.end_date);
    // daysUntilDue: 正数=还剩几天，0=今天到期，负数=已逾期
    const daysUntilDue = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // 只提醒 0-2 天内到期的（超过 2 天不打扰）
    if (daysUntilDue < 0 || daysUntilDue > 2) continue;

    const assetName = booking.assets?.name ?? '设备';
    const title = daysUntilDue === 0 ? '今日到期 — 请立即归还' : `还有 ${daysUntilDue} 天到期`;
    const message =
      daysUntilDue === 0
        ? `您借用的「${assetName}」今天到期，请尽快归还，逾期将按天扣减信用分！`
        : `您借用的「${assetName}」还有 ${daysUntilDue} 天到期（${booking.end_date}），请记得按时归还。`;

    await db.from('notifications').insert({
      user_id: user.id,
      type: 'return_reminder',
      title,
      message,
      is_read: false,
      metadata: { booking_id: booking.id, days_until_due: daysUntilDue },
    });
  }
}

/**
 * Check suspended bookings due within 12 hours; send urgent notification and auto-cancel.
 * 检查 12 小时内将到取货日的 suspended 预约，发紧急通知并自动取消。
 *
 * Called fire-and-forget on BookingHistoryScreen mount.
 * 在借用记录页加载时静默调用（无需 await）。
 */
export async function checkSuspendedBookingsExpiring(): Promise<void> {
  const user = await getCurrentUser();

  // 拉取当前用户所有 suspended 且 rejection_reason = ASSET_MAINTENANCE 的预约
  const { data: bookings, error } = await db
    .from('bookings')
    .select('id, start_date, assets(name)')
    .eq('borrower_id', user.id)
    .eq('status', 'suspended')
    .eq('rejection_reason', 'ASSET_MAINTENANCE');

  if (error || !bookings || bookings.length === 0) return;

  const now = new Date();
  // 12 小时截止窗口
  const deadline = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  for (const booking of bookings as { id: string; start_date: string; assets: { name: string } | null }[]) {
    const startDate = new Date(booking.start_date);

    // 取货日在 12h 内（或已过）→ 触发自动取消
    if (startDate <= deadline) {
      const assetName = booking.assets?.name ?? '设备';
      const isPast = startDate <= now;

      // 发紧急通知
      await db.from('notifications').insert({
        user_id: user.id,
        type: 'booking_cancelled',
        title: isPast ? '预约已自动取消' : '紧急通知：预约即将自动取消',
        message: isPast
          ? `您预约的「${assetName}」取货日已过，设备仍在维修中，预约已自动取消。如需借用请重新预约。`
          : `您预约的「${assetName}」取货日（${startDate.toLocaleDateString('en-CA')}）不足 12 小时，设备仍在维修中，预约将自动取消。`,
        is_read: false,
        metadata: { booking_id: booking.id },
      });

      // 自动取消
      await db
        .from('bookings')
        .update({ status: 'cancelled', rejection_reason: 'ASSET_MAINTENANCE_EXPIRED' })
        .eq('id', booking.id);
    }
  }
}

/**
 * Auto-cancel pending bookings whose end_date has already passed (admin never approved).
 * 自动取消审批超时的待审批预约（结束日期已过但仍为 pending）并发通知。
 *
 * Called before fetchBookings so the list always reflects the corrected state.
 * 在拉取借用列表前调用，确保列表数据始终为最新状态。
 */
export async function checkExpiredPendingBookings(): Promise<void> {
  const user = await getCurrentUser();
  const now = new Date().toISOString();

  // 查找结束日期已过且仍为 pending 的预约
  const { data: bookings, error } = await db
    .from('bookings')
    .select('id, end_date, assets(name)')
    .eq('borrower_id', user.id)
    .eq('status', 'pending')
    .lt('end_date', now);

  if (error || !bookings || bookings.length === 0) return;

  for (const booking of bookings as { id: string; end_date: string; assets: { name: string } | null }[]) {
    const assetName = booking.assets?.name ?? '设备';

    // 批量取消 + 标记原因
    await db
      .from('bookings')
      .update({ status: 'cancelled', rejection_reason: 'EXPIRED_PENDING' })
      .eq('id', booking.id);

    // 发通知让用户知晓
    await db.from('notifications').insert({
      user_id: user.id,
      type: 'booking_cancelled',
      title: '预约已自动取消（审批超时）',
      message: `您对「${assetName}」的借用申请超过借用日期仍未获审批，系统已自动取消。如需借用请重新提交预约。`,
      is_read: false,
      metadata: { booking_id: booking.id, reason: 'EXPIRED_PENDING' },
    });
  }
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
