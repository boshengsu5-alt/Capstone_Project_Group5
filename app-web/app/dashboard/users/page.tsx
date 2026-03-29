'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users as UsersIcon, Search, RefreshCw, Shield, GraduationCap, Star, 
  AlertCircle, Edit3, UserX, ChevronDown, ChevronUp 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthContext';
import type { Profile, UserRole } from '@/types/database';
import { getUserDetailStats, type UserDetailStats } from '@/lib/userService';
import UserExpandedRow from '@/components/users/UserExpandedRow';
import UserCreditHistoryModal from '@/components/users/UserCreditHistoryModal';
import Header from '@/components/layout/Header';
import UserEditModal from '@/components/ui/UserEditModal';

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
  
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<Profile | null>(null);

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
      (user.student_id?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-3.5 h-3.5" />;
      default: return <GraduationCap className="w-3.5 h-3.5" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20';
      default: return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20';
    }
  };

  const getCreditColor = (score: number) => {
    if (score < 60) return 'text-rose-600 dark:text-rose-500';
    if (score >= 150) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 100) return 'text-blue-600 dark:text-blue-400';
    return 'text-amber-600 dark:text-amber-400';
  };

  if (!authLoading && !canManageUsers) return null;

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-gray-50 dark:bg-black overflow-y-auto">
      <Header />
      <main className="flex-1 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto w-full">
          <div className="sm:flex sm:items-center mb-8">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-600/20">
                  <UsersIcon className="h-5 w-5 text-white" />
                </div>
                User Management
              </h1>
            </div>
            <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
              <button
                onClick={loadUsers}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4 text-indigo-500", isLoading && "animate-spin")} />
                Refresh Data
              </button>
            </div>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="w-full sm:max-w-md relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student ID or name..."
                className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-4 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-gray-50/50 dark:bg-gray-800/50 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:max-w-xs flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Filter:</span>
              <select
                className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-10 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-800 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-gray-50/50 dark:bg-gray-800/50 transition-all"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
              >
                <option value="all">All Roles</option>
                <option value="student">Students Only</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 rounded-2xl bg-white dark:bg-gray-900">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User Profile</th>
                  <th scope="col" className="px-3 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student ID</th>
                  <th scope="col" className="px-3 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-3 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit Score</th>
                  <th scope="col" className="relative py-4 pl-3 pr-6 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-transparent">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="inline-flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fetching user records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="inline-flex flex-col items-center gap-4">
                        <UserX className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No matching users found.</p>
                      </div>
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
                            "hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group cursor-pointer",
                            isExpanded && "bg-indigo-50/80 dark:bg-indigo-500/5 hover:bg-indigo-50/80 dark:hover:bg-indigo-500/5"
                          )}
                        >
                          <td className="whitespace-nowrap py-5 pl-6 pr-3">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm ring-2 ring-white dark:ring-gray-900 shadow-sm uppercase">
                                  {user.full_name?.[0] || '?'}
                                </div>
                                <div className={cn(
                                  "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 shadow-sm",
                                  user.role === 'admin' ? "bg-purple-500" : "bg-indigo-500"
                                )} />
                              </div>
                              <div className="flex flex-col max-w-[200px]">
                                <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                                  {user.full_name || 'Anonymous User'}
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 opacity-50" /> : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-5 text-sm font-mono text-gray-600 dark:text-gray-400">
                            {user.student_id || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-5">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset capitalize",
                              getRoleBadgeClass(user.role)
                            )}>
                              {getRoleIcon(user.role)}
                              {user.role}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setCreditHistoryUser(user);
                              }}
                              className="flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1.5 rounded-xl transition-all"
                            >
                              <Star className={cn(
                                "w-4 h-4",
                                user.credit_score < 60 ? "text-rose-400" : "text-amber-400"
                              )} />
                              <span className={cn("font-extrabold text-sm", getCreditColor(user.credit_score))}>
                                {user.credit_score}
                              </span>
                              <span className="text-gray-400 dark:text-gray-600 text-[10px] font-bold">/ 200</span>
                              {user.credit_score < 60 && (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                              )}
                            </button>
                          </td>
                          <td className="whitespace-nowrap py-5 pl-3 pr-6 text-right text-sm">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserForEdit(user);
                              }}
                              className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/40"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              修改
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-transparent">
                            <td colSpan={5} className="px-6 py-4">
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
        </div>
      </main>

      {selectedUserForEdit && (
        <UserEditModal
          user={selectedUserForEdit}
          isOpen={!!selectedUserForEdit}
          onClose={() => setSelectedUserForEdit(null)}
          onSuccess={async () => {
            await loadUsers();
          }}
        />
      )}

      <UserCreditHistoryModal
        user={creditHistoryUser}
        isOpen={Boolean(creditHistoryUser)}
        onClose={() => setCreditHistoryUser(null)}
      />
    </div>
  );
}
