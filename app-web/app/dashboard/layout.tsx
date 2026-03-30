'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/components/providers/AuthContext';
import { clearStoredAuthState, setSessionCookie, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/components/providers/LanguageProvider';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { canAccessDashboard, isLoading, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        console.warn('Auth state change detected issue:', event);
        clearStoredAuthState();
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace('/login');
    }
  }, [isLoading, profile, router]);

  useEffect(() => {
    if (!isLoading && profile && !canAccessDashboard) {
      void signOut().finally(() => {
        router.replace('/login');
      });
    }
  }, [canAccessDashboard, isLoading, profile, router]);

  // 更新 session cookie (防止 middleware 拦截)
  useEffect(() => {
    if (profile && canAccessDashboard) {
      setSessionCookie();
    }
  }, [canAccessDashboard, profile]);

  if (isLoading) {
    return (
      <div className="dashboard-shell min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
          <p className="text-sm font-medium text-[color:var(--dashboard-text-muted)]">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!profile || !canAccessDashboard) {
    return null;
  }

  return (
    <ToastProvider>
      <div className="dashboard-shell min-h-screen text-white">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="flex min-h-screen flex-col lg:pl-72">
          <Navbar setSidebarOpen={setSidebarOpen} />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}
