'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/ui/Toast';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { AuthProvider, useAuth } from '@/components/providers/AuthContext';
import { clearStoredAuthState, setSessionCookie, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function DashboardContent({ children }: { children: React.ReactNode }) {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!profile || !canAccessDashboard) {
    return null;
  }

  return (
    <LanguageProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

          <div className="lg:pl-64 flex flex-col min-h-screen">
            <Navbar setSidebarOpen={setSidebarOpen} />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </LanguageProvider>
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
