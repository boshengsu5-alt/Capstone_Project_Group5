'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, ScrollText, LogOut, User, ChevronDown, Languages } from 'lucide-react';
import { signOut } from '@/lib/auth';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';

interface UserDropdownProps {
  email?: string | null;
}

export default function UserDropdown({ email }: UserDropdownProps) {
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  const [user, setUser] = useState<any>(null);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  useEffect(() => {
    fetchUser();

    const handleUpdate = () => {
      fetchUser();
    };

    window.addEventListener('avatar-updated', handleUpdate);
    
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('avatar-updated', handleUpdate);
    };
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    router.replace('/login');
  };

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'zh' : 'en');
    setOpen(false);
  };

  const menuItems = [
    {
      label: locale === 'zh' ? '账号设置' : 'Account Settings',
      icon: Settings,
      action: () => { setOpen(false); router.push('/dashboard/settings'); },
      className: 'text-gray-100 hover:bg-purple-500/20',
      iconClassName: 'text-purple-400',
    },
    {
      label: locale === 'zh' ? '查看日志' : 'Audit Logs',
      icon: ScrollText,
      action: () => { setOpen(false); router.push('/dashboard/audit-logs'); },
      className: 'text-gray-100 hover:bg-purple-500/20',
      iconClassName: 'text-purple-400',
    },
    {
      label: t('common.switchLang'),
      icon: Languages,
      action: toggleLanguage,
      className: 'text-gray-100 hover:bg-purple-500/20',
      iconClassName: 'text-amber-400',
    },
  ];

  return (
    <div className="relative" ref={ref}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-x-3 group select-none"
        aria-haspopup="true"
        aria-expanded={open}
        id="user-menu-button"
      >
        {/* Avatar with purple gradient border */}
        <div className="relative p-[2px] rounded-full bg-gradient-to-br from-purple-600 via-violet-500 to-amber-400 transition-transform duration-200 group-hover:scale-110">
          <div className="h-8 w-8 rounded-full bg-gray-900 overflow-hidden flex items-center justify-center border border-gray-950">
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Avatar" 
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4 text-purple-300" />
            )}
          </div>
        </div>

        {/* Two-line text */}
        <span className="hidden lg:flex lg:flex-col lg:items-start leading-tight">
          <span className="text-sm font-semibold text-white tracking-wide">
            Admin User
          </span>
          <span className="text-xs text-purple-300 truncate max-w-[140px]">
            {email ?? 'admin@unigear.edu'}
          </span>
        </span>

        <ChevronDown
          className={`hidden lg:block h-4 w-4 text-purple-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-52 z-50 origin-top-right
                     bg-gray-900/80 backdrop-blur-xl
                     border border-purple-500/30
                     rounded-xl shadow-2xl shadow-purple-900/40
                     ring-1 ring-black/10
                     animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-purple-500/20">
            <p className="text-xs font-semibold text-purple-300 uppercase tracking-widest">
              已登录
            </p>
            <p className="mt-0.5 text-sm text-gray-200 truncate">
              {email ?? 'admin@unigear.edu'}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className={`w-full flex items-center gap-x-3 px-4 py-2.5 text-sm font-medium transition-colors ${item.className}`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${item.iconClassName}`} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Divider + Sign Out */}
          <div className="border-t border-purple-500/20 py-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex items-center gap-x-3 px-4 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/15 transition-colors disabled:opacity-50"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {loading ? (locale === 'zh' ? '退出中…' : 'Signing out…') : (locale === 'zh' ? '安全退出' : 'Sign Out')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
