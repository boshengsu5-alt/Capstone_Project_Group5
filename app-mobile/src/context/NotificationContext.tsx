import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getUnreadCount } from '../services/notificationService';
import { useToast } from './ToastContext';
import { Session } from '@supabase/supabase-js';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const { showToast } = useToast();

  const refreshUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('[NotificationContext] Failed to get unread count:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
        setUnreadCount(0);
        return;
    }

    refreshUnreadCount();

    // Subscribe to real-time notifications for the current user
    const channel = supabase
      .channel(`user-notifications-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          if (__DEV__) console.log('[NotificationContext] New notification received:', payload);
          setUnreadCount((prev) => prev + 1);

          const newNotification = payload.new as Record<string, unknown>;
          // 根据通知类型显示对应 toast，避免硬编码资产种类
          if (newNotification.type === 'booking_approved') {
            showToast('您的借用申请已获批！');
          } else if (newNotification.type === 'booking_rejected') {
            showToast('您的借用申请已被拒绝，请查看通知了解原因。');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
            // Update unread count if a notification was marked as read
            const oldNotification = payload.old as Record<string, unknown>;
            const newNotification = payload.new as Record<string, unknown>;
            if (!oldNotification.is_read && newNotification.is_read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } else if (oldNotification.is_read && !newNotification.is_read) {
                setUnreadCount((prev) => prev + 1);
            }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, showToast]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
