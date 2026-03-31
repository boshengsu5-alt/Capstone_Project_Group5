'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User as AuthUser } from '@supabase/supabase-js';
import { Settings, ScrollText, LogOut, User, ChevronDown, Languages } from 'lucide-react';
import { getCurrentUser, signOut } from '@/lib/auth';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthContext';
import { getRoleLabel } from '@/lib/i18n';

interface UserDropdownProps {
  email?: string | null;
}

export default function UserDropdown({ email }: UserDropdownProps) {
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const { canViewAuditLogs, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const fetchUser = async (): Promise<AuthUser | null> => {
    return getCurrentUser();
  };

  useEffect(() => {
    void fetchUser().then((currentUser) => {
      setUser(currentUser);
    });

    const handleUpdate = () => {
      void fetchUser().then((currentUser) => {
        setUser(currentUser);
      });
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
      label: t('settings.accountSettings'),
      icon: Settings,
      action: () => { setOpen(false); router.push('/dashboard/settings'); },
      className: 'text-gray-100 hover:bg-white/[0.05]',
      iconClassName: 'text-amber-300',
    },
    ...(canViewAuditLogs ? [{
      label: t('settings.auditLogs'),
      icon: ScrollText,
      action: () => { setOpen(false); router.push('/dashboard/audit-logs'); },
      className: 'text-gray-100 hover:bg-white/[0.05]',
      iconClassName: 'text-sky-300',
    }] : []),
    {
      label: t('common.switchLang'),
      icon: Languages,
      action: toggleLanguage,
      className: 'text-gray-100 hover:bg-white/[0.05]',
      iconClassName: 'text-amber-400',
    },
  ];

  const roleLabel = profile?.role ? getRoleLabel(profile.role, t) : t('roles.adminUser');
  const displayName = profile?.full_name?.trim() || roleLabel;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group flex items-center gap-x-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.05] select-none"
        aria-haspopup="true"
        aria-expanded={open}
        id="user-menu-button"
      >
        <div className="relative rounded-full bg-gradient-to-br from-amber-300 via-violet-400 to-violet-500 p-[2px] transition-transform duration-200 group-hover:scale-105">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-black bg-[#090c11]">
            {(profile?.avatar_url || user?.user_metadata?.avatar_url) ? (
              <img
                src={profile?.avatar_url || user?.user_metadata?.avatar_url}
                alt={getRoleLabel(profile?.role ?? 'admin', t)}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4 text-amber-200" />
            )}
          </div>
        </div>

        <span className="hidden leading-tight lg:flex lg:flex-col lg:items-start">
          <span className="text-sm font-semibold tracking-wide text-white">
            {displayName}
          </span>
          <span className="max-w-[180px] truncate text-xs text-[color:var(--dashboard-text-soft)]">
            {email ?? 'admin@unigear.edu'}
          </span>
        </span>

        <ChevronDown
          className={`hidden h-4 w-4 text-[color:var(--dashboard-text-muted)] transition-transform duration-200 lg:block ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="dashboard-panel-strong absolute right-0 z-50 mt-3 w-64 origin-top-right rounded-[24px] animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="border-b border-white/6 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/80">
              {t('auth.loggedIn')}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{displayName}</p>
            <p className="mt-1 truncate text-sm text-[color:var(--dashboard-text-muted)]">
              {email ?? 'admin@unigear.edu'}
            </p>
          </div>

          <div className="py-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className={`flex w-full items-center gap-x-3 px-4 py-3 text-sm font-medium transition-colors ${item.className}`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${item.iconClassName}`} />
                {item.label}
              </button>
            ))}
          </div>

          <div className="border-t border-white/6 py-2">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="flex w-full items-center gap-x-3 px-4 py-3 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {loading ? t('auth.signingOut') : t('auth.signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
