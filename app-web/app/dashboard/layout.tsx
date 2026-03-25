'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/ui/Toast';
import { getCurrentUser, checkAdminRole, setAdminCookie, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Day 4 安全要求：非 admin/staff 用户禁止进入管理后台
    async function verifyAccess() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace('/login');
          return;
        }
        const isAdmin = await checkAdminRole(user.id);
        if (!isAdmin) {
          await signOut();
          router.replace('/login');
          return;
        }
        // 刷新 middleware cookie（续期）
        setAdminCookie();
        setAuthChecked(true);
      } catch {
        router.replace('/login');
      }
    }
    verifyAccess();

    // 监听 auth 状态变化：当 refresh token 失效时 Supabase 会触发 SIGNED_OUT 事件，
    // 此时需要清理本地过期 session 并跳转登录页，避免控制台抛出未处理的 AuthApiError
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        document.cookie = 'unigear-admin=; path=/; max-age=0';
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // 权限校验中显示加载状态
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="lg:pl-64 flex flex-col min-h-screen">
          <Navbar setSidebarOpen={setSidebarOpen} />

          <main className="flex-1 py-10">
            <div className="px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
