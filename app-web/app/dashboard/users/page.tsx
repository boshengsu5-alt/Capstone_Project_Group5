// @ts-nocheck
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

export default function UsersPage() {
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
      showToast('Failed to load users.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

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
      const message = error instanceof Error ? error.message : 'Failed to load user details.';
      setDetailErrorMap((current) => ({ ...current, [userId]: message }));
      showToast('Failed to load user details.', 'error');
    } finally {
      setDetailLoadingMap((current) => ({ ...current, [userId]: false }));
    }
  }, [detailLoadingMap, detailMap, showToast]);

  const handleToggleExpand = useCallback((user: Profile) => {
    const nextExpanded = expandedUserId === user.id ? null : user.id;
    setExpandedUserId(nextExpanded);

    if (nextExpanded === user.id) {
      void loadDetailForUser(user.id);
    }
  }, [expandedUserId, loadDetailForUser]);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.student_id?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-3.5 h-3.5" />;
      case 'staff': return <Briefcase className="w-3.5 h-3.5" />;
      default: return <GraduationCap className="w-3.5 h-3.5" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20';
      case 'staff': return 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20';
      default: return 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20';
    }
  };

  const getCreditColor = (score: number) => {
    if (score >= 150) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 100) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const stats = {
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    admins: users.filter(u => u.role === 'admin').length,
    staff: users.filter(u => u.role === 'staff').length,
  };

  if (!authLoading && !canManageUsers) {
    return null;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <UsersIcon className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">User Management</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and manage all registered users, roles, and credit scores.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Users</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.students}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Students</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.admins}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Admins</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.staff}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Staff</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="w-full sm:max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or student ID..."
            className="block w-full rounded-md border-0 py-2 pl-10 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-white dark:bg-gray-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:max-w-xs flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Role:</span>
          <select
            className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-white dark:bg-gray-800"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="w-full h-64 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading users...</p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">User</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Student ID</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Department</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Role</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Credit Score</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500 dark:text-gray-400">
                    {users.length === 0 ? 'No users found.' : 'No users match your search criteria.'}
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
                          'cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                          isExpanded && 'bg-indigo-50/80 dark:bg-indigo-500/5'
                        )}
                      >
                        <td className="py-4 pl-4 pr-3 sm:pl-6">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                {user.full_name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900 dark:text-white">{user.full_name || 'Unnamed'}</p>
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                              </div>
                            </div>
                            <div className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 sm:flex">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {user.student_id || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {user.department || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize",
                            getRoleBadgeClass(user.role)
                          )}>
                            {getRoleIcon(user.role)}
                            {user.role}
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
                            className="group inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 transition hover:border-indigo-200 hover:bg-indigo-50 dark:hover:border-indigo-500/20 dark:hover:bg-indigo-500/10"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-400 transition group-hover:scale-110" />
                            <span className={cn("font-semibold", getCreditColor(user.credit_score))}>
                              {user.credit_score}
                            </span>
                            <span className="text-gray-400 text-xs">/ 200</span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(user.created_at).toLocaleDateString()}
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
      )}

      <UserCreditHistoryModal
        user={creditHistoryUser}
        isOpen={Boolean(creditHistoryUser)}
        onClose={() => setCreditHistoryUser(null)}
      />
    </div>
  );
}
