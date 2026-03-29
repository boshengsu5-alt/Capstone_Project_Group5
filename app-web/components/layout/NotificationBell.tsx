'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCircle2, XCircle, Clock, AlertTriangle,
  RotateCcw, Star, Package, CheckCheck, Inbox, PauseCircle, BadgeDollarSign,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Notification, NotificationType } from '@/types/database';

// Hand-written Database types and Supabase client generics do not fully align for
// update/select helpers in this repo. Use a local alias to avoid noisy false positives.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============================================================
// Icon + color config per notification type. 各通知类型图标配色
// ============================================================

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string; route: string }> = {
  booking_pending:  { icon: Package,      color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  route: '/dashboard/bookings' },
  booking_approved: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', route: '/dashboard/bookings' },
  booking_rejected: { icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-500/10',    route: '/dashboard/bookings' },
  booking_suspended:{ icon: PauseCircle,  color: 'text-amber-400',   bg: 'bg-amber-500/10',   route: '/dashboard/bookings' },
  booking_restored: { icon: RotateCcw,    color: 'text-sky-400',     bg: 'bg-sky-500/10',     route: '/dashboard/bookings' },
  booking_cancelled:{ icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-500/10',    route: '/dashboard/bookings' },
  return_submitted: { icon: RotateCcw,    color: 'text-sky-400',     bg: 'bg-sky-500/10',     route: '/dashboard/returns'  },
  return_reminder:  { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10',   route: '/dashboard/returns'  },
  overdue_alert:    { icon: Clock,        color: 'text-rose-400',    bg: 'bg-rose-500/10',    route: '/dashboard/bookings' },
  damage_reported:  { icon: AlertTriangle,color: 'text-orange-400',  bg: 'bg-orange-500/10',  route: '/dashboard/damage'   },
  compensation_update: { icon: BadgeDollarSign, color: 'text-amber-300', bg: 'bg-amber-500/10', route: '/dashboard/compensation' },
  review_reply:     { icon: Star,         color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  route: '/dashboard/bookings' },
  system:           { icon: Bell,         color: 'text-gray-400',    bg: 'bg-gray-700',        route: ''                    },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ============================================================
// Component. 组件
// ============================================================

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Fetch notifications ───────────────────────────────────
  const fetchNotifications = async (uid: string) => {
    const { data } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  };

  // ── Init: get user, load data, subscribe realtime ─────────
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      fetchNotifications(user.id);

      // Real-time: insert new notifications for this user
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

  // ── Close dropdown on outside click ──────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Mark single notification as read + navigate ───────────
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

  // ── Mark all as read ──────────────────────────────────────
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
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="-m-2.5 p-2.5 text-gray-400 hover:text-purple-300 transition-colors relative"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-bold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/[0.04]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-500">
                <Inbox size={32} className="opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors ${!n.is_read ? 'bg-purple-500/[0.04]' : ''}`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-lg ${cfg.bg}`}>
                      <Icon size={14} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold truncate ${n.is_read ? 'text-gray-400' : 'text-white'}`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-purple-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
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
