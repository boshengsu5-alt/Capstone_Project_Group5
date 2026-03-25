'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/ui/Toast';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
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
    async function verifyAccess() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace('/login');
          return;
        }
        const isAdmin = await checkAdminRole(user.id);
        if (!isAdmin) {
          // If not admin, sign out and redirect
          await signOut();
          router.replace('/login');
          return;
        }
        // Refresh middleware cookie
        setAdminCookie();
        setAuthChecked(true);
      } catch {
        router.replace('/login');
      }
    }
    verifyAccess();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        // Clear cookie manually if needed
        document.cookie = 'unigear-admin=; path=/; max-age=0';
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

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
