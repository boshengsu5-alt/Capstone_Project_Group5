'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCircle2, XCircle, Clock, AlertTriangle,
  RotateCcw, Star, Package, CheckCheck, Inbox, PauseCircle, BadgeDollarSign,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Notification, NotificationType } from '@/types/database';
import { formatRelativeTime } from '@/lib/i18n';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getNotificationText } from '@/lib/notificationText';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string; route: string }> = {
  booking_pending:  { icon: Package, color: 'text-indigo-400', bg: 'bg-indigo-500/10', route: '/dashboard/bookings' },
  booking_approved: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', route: '/dashboard/bookings' },
  booking_rejected: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', route: '/dashboard/bookings' },
  booking_suspended:{ icon: PauseCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', route: '/dashboard/bookings' },
  booking_restored: { icon: RotateCcw, color: 'text-sky-400', bg: 'bg-sky-500/10', route: '/dashboard/bookings' },
  booking_cancelled:{ icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', route: '/dashboard/bookings' },
  return_submitted: { icon: RotateCcw, color: 'text-sky-400', bg: 'bg-sky-500/10', route: '/dashboard/returns' },
  return_reminder:  { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', route: '/dashboard/returns' },
  overdue_alert:    { icon: Clock, color: 'text-rose-400', bg: 'bg-rose-500/10', route: '/dashboard/bookings' },
  damage_reported:  { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', route: '/dashboard/damage' },
  compensation_update: { icon: BadgeDollarSign, color: 'text-amber-300', bg: 'bg-amber-500/10', route: '/dashboard/compensation' },
  review_reply:     { icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10', route: '/dashboard/assets' },
  system:           { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-700', route: '' },
};

export default function NotificationBell() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = async (uid: string) => {
    const { data } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void getCurrentUser().then((user) => {
      if (!user) return;
      setUserId(user.id);
      fetchNotifications(user.id);

      channel = supabase
        .channel(`notif-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20));
        })
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await db
        .from('notifications')
        .update({ is_read: true })
        .eq('id', n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
    }
    const route = TYPE_CONFIG[n.type]?.route;
    if (route) {
      setIsOpen(false);
      router.push(route);
    }
  };

  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    await db
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
        aria-label={t('notificationBell.ariaLabel')}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="dashboard-panel-strong absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-[28px] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/6 px-4 py-4">
            <span className="text-sm font-bold text-white">{t('notificationBell.title')}</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-amber-300 transition-colors hover:text-amber-200"
              >
                <CheckCheck size={12} />
                {t('notificationBell.markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-white/[0.04]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-[color:var(--dashboard-text-muted)]">
                <Inbox size={32} className="opacity-40" />
                <p className="text-sm">{t('notificationBell.empty')}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
                const Icon = cfg.icon;
                const localized = getNotificationText(t, n);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] ${!n.is_read ? 'bg-amber-500/[0.04]' : ''}`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 rounded-lg p-1.5 ${cfg.bg}`}>
                      <Icon size={14} className={cfg.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-xs font-semibold ${n.is_read ? 'text-gray-400' : 'text-white'}`}>
                          {localized.title}
                        </p>
                        {!n.is_read && (
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-300" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
                        {localized.message}
                      </p>
                      <p className="mt-1 text-[10px] text-gray-600">{formatRelativeTime(n.created_at, locale)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
