'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ClipboardList, RotateCcw, AlertTriangle, ScrollText, Users, X, BadgeDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { canManageAssets, canManageUsers, canViewAuditLogs } = useAuth();

  const navigation = [
    { name: t('sidebar.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    ...(canManageAssets ? [
      { name: t('sidebar.assets'), href: '/dashboard/assets', icon: Package },
    ] : []),
    { name: t('sidebar.bookings'), href: '/dashboard/bookings', icon: ClipboardList },
    { name: t('sidebar.returns'), href: '/dashboard/returns', icon: RotateCcw },
    { name: t('sidebar.damage'), href: '/dashboard/damage', icon: AlertTriangle },
    { name: t('sidebar.compensation'), href: '/dashboard/compensation', icon: BadgeDollarSign },
    ...(canViewAuditLogs ? [
      { name: t('sidebar.audit'), href: '/dashboard/audit-logs', icon: ScrollText },
    ] : []),
    ...(canManageUsers ? [
      { name: t('sidebar.users'), href: '/dashboard/users', icon: Users },
    ] : []),
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={cn(
          'dashboard-scrollbar fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-white/8 bg-[linear-gradient(180deg,rgba(11,11,13,0.98),rgba(7,7,8,0.98))] shadow-[30px_0_80px_rgba(0,0,0,0.28)] transition-transform duration-300 ease-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-24 shrink-0 items-center justify-between border-b border-white/6 px-6">
          <div className="flex items-center gap-3">
            <div className="dashboard-icon-frame flex h-14 w-14 items-center justify-center rounded-2xl">
              <LayoutDashboard className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300/90">{t('common.active')}</p>
              <span className="text-2xl font-semibold tracking-tight text-white">UniGear</span>
            </div>
          </div>
          <button
            type="button"
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-gray-400 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
            onClick={() => setIsOpen(false)}
          >
            <span className="sr-only">{t('common.closeSidebar')}</span>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col px-4 py-6">
          <div className="px-3 pb-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--dashboard-text-muted)]">
              {t('common.general')}
            </p>
          </div>
          <ul role="list" className="flex flex-1 flex-col gap-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      isActive
                        ? 'border border-amber-400/16 bg-gradient-to-r from-amber-500/[0.14] via-white/[0.03] to-transparent text-white shadow-[0_18px_40px_rgba(0,0,0,0.18)]'
                        : 'border border-transparent text-gray-400 hover:border-white/6 hover:bg-white/[0.035] hover:text-white',
                      'group flex items-center gap-x-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                        isActive ? 'bg-amber-500/12 text-amber-300' : 'bg-white/[0.03] text-gray-500 group-hover:text-gray-200'
                      )}
                    >
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="dashboard-panel mt-6 rounded-[28px] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--dashboard-text-muted)]">
              {t('settings.title')}
            </p>
            <p className="mt-3 text-sm font-semibold text-white">
              {t('settings.accountSettings')}
            </p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--dashboard-text-muted)]">
              {t('settings.subtitle')}
            </p>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
