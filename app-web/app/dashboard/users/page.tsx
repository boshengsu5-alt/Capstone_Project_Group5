'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users as UsersIcon, Search, RefreshCw, Shield, GraduationCap, Briefcase, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthContext';
import type { Profile, UserRole } from '@/types/database';
import { getUserDetailStats, type UserDetailStats } from '@/lib/userService';
import UserExpandedRow from '@/components/users/UserExpandedRow';
import UserCreditHistoryModal from '@/components/users/UserCreditHistoryModal';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getIntlLocale, getRoleLabel } from '@/lib/i18n';
import Header from '@/components/layout/Header';
import UserEditModal from '@/components/ui/UserEditModal';

export default function UsersPage() {
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const { canManageUsers, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, UserDetailStats>>({});
  const [detailLoadingMap, setDetailLoadingMap] = useState<Record<string, boolean>>({});
  const [detailErrorMap, setDetailErrorMap] = useState<Record<string, string>>({});
  const [creditHistoryUser, setCreditHistoryUser] = useState<Profile | null>(null);
  const [editUser, setEditUser] = useState<Profile | null>(null);

  useEffect(() => {
    if (!authLoading && !canManageUsers) {
      router.replace('/dashboard/access-denied');
    }
  }, [authLoading, canManageUsers, router]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data ?? []);
    } catch (error) {
      console.error('Failed to load users:', error);
      showToast(t('users.detailLoadFailed'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const loadDetailForUser = useCallback(async (userId: string, force = false) => {
    if (!force && (detailMap[userId] || detailLoadingMap[userId])) {
      return;
    }

    setDetailLoadingMap((current) => ({ ...current, [userId]: true }));
    setDetailErrorMap((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });

    try {
      const data = await getUserDetailStats(userId);
      setDetailMap((current) => ({ ...current, [userId]: data }));
    } catch (error) {
      console.error('Failed to load user detail stats:', error);
      const message = error instanceof Error ? error.message : t('users.detailLoadFailed');
      setDetailErrorMap((current) => ({ ...current, [userId]: message }));
      showToast(t('users.detailLoadFailed'), 'error');
    } finally {
      setDetailLoadingMap((current) => ({ ...current, [userId]: false }));
    }
  }, [detailLoadingMap, detailMap, showToast, t]);

  const handleToggleExpand = useCallback((user: Profile) => {
    const nextExpanded = expandedUserId === user.id ? null : user.id;
    setExpandedUserId(nextExpanded);

    if (nextExpanded === user.id) {
      void loadDetailForUser(user.id);
    }
  }, [expandedUserId, loadDetailForUser]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.student_id?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-3.5 w-3.5" />;
      case 'staff': return <Briefcase className="h-3.5 w-3.5" />;
      default: return <GraduationCap className="h-3.5 w-3.5" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-violet-500/12 text-violet-200 ring-violet-400/20';
      case 'staff': return 'bg-sky-500/12 text-sky-200 ring-sky-400/20';
      default: return 'bg-white/[0.06] text-gray-200 ring-white/10';
    }
  };

  const getCreditColor = (score: number) => {
    if (score >= 150) return 'text-emerald-300';
    if (score >= 100) return 'text-sky-300';
    if (score >= 50) return 'text-amber-300';
    return 'text-rose-300';
  };

  const stats = {
    total: users.length,
    students: users.filter((u) => u.role === 'student').length,
    admins: users.filter((u) => u.role === 'admin').length,
    staff: users.filter((u) => u.role === 'staff').length,
  };

  if (!authLoading && !canManageUsers) {
    return null;
  }

  return (
    <div className="dashboard-shell flex flex-1 flex-col overflow-y-auto bg-[#050505] text-gray-100">
      <Header />

      <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-8 p-6 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="dashboard-icon-frame rounded-2xl p-3">
                <UsersIcon className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-300">{t('header.users')}</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{t('users.title')}</h1>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-[color:var(--dashboard-text-muted)]">
              {t('users.subtitle')}
            </p>
          </div>

          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.07] disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            {t('users.refresh')}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: t('users.totalUsers'), value: stats.total, tone: 'border-white/10 bg-white/[0.03]' },
            { label: t('users.students'), value: stats.students, tone: 'border-emerald-400/16 bg-emerald-500/[0.06]' },
            { label: t('users.admins'), value: stats.admins, tone: 'border-violet-400/16 bg-violet-500/[0.06]' },
            { label: t('users.staff'), value: stats.staff, tone: 'border-sky-400/16 bg-sky-500/[0.06]' },
          ].map((card) => (
            <div key={card.label} className={cn('dashboard-panel rounded-[28px] p-5', card.tone)}>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--dashboard-text-muted)]">{card.label}</p>
              <p className="mt-4 text-3xl font-bold text-white">{card.value}</p>
              <p className="mt-2 text-sm text-[color:var(--dashboard-text-muted)]">{t('users.subtitle')}</p>
            </div>
          ))}
        </div>

        <div className="dashboard-panel rounded-[32px] p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--dashboard-text-muted)]" />
              <input
                type="text"
                placeholder={t('users.searchPlaceholder')}
                className="dashboard-field block w-full py-3 pl-11 pr-4 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex w-full items-center gap-3 lg:max-w-sm">
              <span className="whitespace-nowrap text-sm text-[color:var(--dashboard-text-muted)]">{t('users.roleLabel')}</span>
              <select
                className="dashboard-field block w-full px-4 py-3 text-sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
              >
                <option value="all">{t('users.allRoles')}</option>
                <option value="student">{getRoleLabel('student', t)}</option>
                <option value="admin">{getRoleLabel('admin', t)}</option>
                <option value="staff">{getRoleLabel('staff', t)}</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 w-full flex-col items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.03]">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            <p className="font-medium text-[color:var(--dashboard-text-muted)]">{t('users.loading')}</p>
          </div>
        ) : (
          <div className="dashboard-panel overflow-hidden rounded-[32px]">
            <div className="dashboard-scrollbar overflow-x-auto">
              <table className="min-w-full divide-y divide-white/6">
                <thead className="bg-white/[0.03]">
                  <tr>
                    <th scope="col" className="py-4 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--dashboard-text-muted)] sm:pl-6">{t('users.user')}</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--dashboard-text-muted)]">{t('users.studentId')}</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--dashboard-text-muted)]">{t('users.department')}</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--dashboard-text-muted)]">{t('users.role')}</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--dashboard-text-muted)]">{t('users.creditScore')}</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--dashboard-text-muted)]">{t('users.joined')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 bg-[#080b10]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-[color:var(--dashboard-text-muted)]">
                        {users.length === 0 ? t('users.noUsers') : t('users.noUsersFiltered')}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isExpanded = expandedUserId === user.id;

                      return (
                        <Fragment key={user.id}>
                          <tr
                            onClick={() => handleToggleExpand(user)}
                            className={cn(
                              'group cursor-pointer transition hover:bg-white/[0.03]',
                              isExpanded && 'bg-violet-500/[0.05]'
                            )}
                          >
                            <td className="py-4 pl-5 pr-3 sm:pl-6">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-sm font-bold text-white">
                                    {user.full_name?.[0]?.toUpperCase() || '?'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-white">{user.full_name || t('users.unnamed')}</p>
                                    <p className="truncate text-xs text-[color:var(--dashboard-text-muted)]">{user.email}</p>
                                  </div>
                                </div>
                                <div className="hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-gray-400 transition group-hover:text-white sm:flex">
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-[color:var(--dashboard-text-soft)]">
                              {user.student_id || '-'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-[color:var(--dashboard-text-soft)]">
                              {user.department || '-'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className={cn(
                                'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset capitalize',
                                getRoleBadgeClass(user.role)
                              )}>
                                {getRoleIcon(user.role)}
                                {getRoleLabel(user.role, t)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setExpandedUserId(user.id);
                                  void loadDetailForUser(user.id);
                                  setCreditHistoryUser(user);
                                }}
                                className="group inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 transition hover:border-amber-400/20 hover:bg-amber-500/[0.06]"
                              >
                                <Star className="h-3.5 w-3.5 text-amber-300 transition group-hover:scale-110" />
                                <span className={cn('font-semibold', getCreditColor(user.credit_score))}>
                                  {user.credit_score}
                                </span>
                                <span className="text-xs text-[color:var(--dashboard-text-muted)]">/ 200</span>
                              </button>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-[color:var(--dashboard-text-soft)]">
                              {new Date(user.created_at).toLocaleDateString(getIntlLocale(locale))}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-transparent">
                              <td colSpan={6} className="px-4 py-4 sm:px-6">
                                <UserExpandedRow
                                  user={user}
                                  stats={detailMap[user.id]}
                                  isLoading={Boolean(detailLoadingMap[user.id])}
                                  error={detailErrorMap[user.id]}
                                  onRetry={() => void loadDetailForUser(user.id, true)}
                                  onOpenCreditHistory={() => setCreditHistoryUser(user)}
                                  onEditUser={() => setEditUser(user)}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <UserCreditHistoryModal
          user={creditHistoryUser}
          isOpen={Boolean(creditHistoryUser)}
          onClose={() => setCreditHistoryUser(null)}
        />

        {editUser && (
          <UserEditModal
            user={editUser}
            isOpen={true}
            onClose={() => setEditUser(null)}
            onSuccess={() => {
              void loadUsers();
              void loadDetailForUser(editUser.id, true);
            }}
          />
        )}
      </main>
    </div>
  );
}
