'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function Header() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const pathSegments = pathname.split('/').filter(Boolean);
  const segmentMap: Record<string, string> = {
    dashboard: t('header.dashboard'),
    assets: t('header.assets'),
    bookings: t('header.bookings'),
    returns: t('header.returns'),
    damage: t('header.damage'),
    compensation: t('header.compensation'),
    'audit-logs': t('header.auditLogs'),
    settings: t('header.settings'),
    users: t('header.users'),
    'access-denied': t('header.accessDenied'),
    login: t('header.login'),
  };

  return (
    <div className="border-b border-white/5 bg-white/[0.015] backdrop-blur-sm">
      <div className="mx-auto flex h-[82px] w-full max-w-[1680px] items-center px-6 lg:px-10">
        <nav className="flex items-center" aria-label={t('header.breadcrumb')}>
          <ol role="list" className="flex flex-wrap items-center gap-2 sm:gap-4">
            <li>
              <div className="flex items-center">
                <Link
                  href="/dashboard"
                  className="dashboard-chip rounded-2xl px-3 py-2 text-[color:var(--dashboard-text-muted)] transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                >
                  <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="sr-only">{t('header.dashboardSr')}</span>
                </Link>
              </div>
            </li>

            {pathSegments.map((segment, index) => {
              if (segment === 'dashboard') return null;

              const isLast = index === pathSegments.length - 1;
              const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
              const title = segmentMap[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);

              return (
                <li key={segment}>
                  <div className="flex items-center">
                    <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--dashboard-text-muted)]" aria-hidden="true" />
                    <Link
                      href={href}
                      className={`ml-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        isLast
                          ? 'bg-white/[0.05] text-white'
                          : 'text-[color:var(--dashboard-text-muted)] hover:text-white'
                      }`}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {title}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
