'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/ui/Toast';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { AuthProvider, useAuth } from '@/components/providers/AuthContext';
import { signOut, setSessionCookie } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        console.warn('Auth state change detected issue:', event);
        document.cookie = 'unigear-session=; path=/; max-age=0';
        if (typeof window !== 'undefined') localStorage.clear();
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // 更新 session cookie (防止 midddleware 拦截)
  useEffect(() => {
    if (profile) {
      setSessionCookie();
    }
  }, [profile]);

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

  // 如果加载完成后仍没有 profile，说明未登录
  if (!profile) {
    router.replace('/login');
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
