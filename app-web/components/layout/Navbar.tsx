'use client';

import { useState, useEffect, type FC } from 'react';
import { Menu } from 'lucide-react';
import UserDropdown from './UserDropdown';
import NotificationBell from './NotificationBell';
import { getCurrentUser } from '@/lib/auth';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface NavbarProps {
  setSidebarOpen: (isOpen: boolean) => void;
}

const Navbar: FC<NavbarProps> = ({ setSidebarOpen }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-black/55 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-[1680px] items-center gap-x-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-gray-300 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">{t('common.openSidebar')}</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>

        <div className="h-7 w-px bg-white/8 lg:hidden" aria-hidden="true" />

        <div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
          <div className="flex-1" />

          <div className="flex items-center gap-x-3 lg:gap-x-4">
            <NotificationBell />
            <div className="hidden lg:block lg:h-8 lg:w-px lg:bg-white/8" aria-hidden="true" />
            <UserDropdown email={email} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
