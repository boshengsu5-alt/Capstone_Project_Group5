'use client';

import { useState, useEffect, type FC } from 'react';
import { Menu, Bell } from 'lucide-react';
import UserDropdown from './UserDropdown';
import { getCurrentUser } from '@/lib/auth';

interface NavbarProps {
  setSidebarOpen: (isOpen: boolean) => void;
}

const Navbar: FC<NavbarProps> = ({ setSidebarOpen }) => {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md px-4 shadow-lg shadow-black/30 sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-400 hover:text-purple-300 lg:hidden transition-colors"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-700 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
        {/* Left: spacer */}
        <div className="flex-1" />

        {/* Right: actions */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Bell icon */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-purple-300 transition-colors relative"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-700" aria-hidden="true" />

          {/* User Dropdown */}
          <UserDropdown email={email} />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
