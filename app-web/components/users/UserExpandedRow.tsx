'use client';

import type { ComponentType } from 'react';
import { useState } from 'react';
import { AlertTriangle, ArrowUpRight, BookCopy, Building2, CalendarDays, Check, GraduationCap, Mail, Pencil, Phone, ShieldAlert, Sparkles, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCreditReasonLabel, updateUserProfile, type UserDetailStats } from '@/lib/userService';
import type { Profile } from '@/types/database';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getIntlLocale, getRoleLabel } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';

interface UserExpandedRowProps {
  user: Profile;
  stats?: UserDetailStats;
  isLoading: boolean;
  error?: string;
  onRetry: () => void;
  onOpenCreditHistory: () => void;
  onUserUpdated: () => void;
}

function getCreditTone(score: number) {
  if (score >= 150) {
    return {
      text: 'text-emerald-300',
      badge: 'Excellent',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20',
      barClass: 'from-emerald-400 via-teal-400 to-cyan-400',
    };
  }

  if (score >= 100) {
    return {
      text: 'text-blue-300',
      badge: 'Stable',
      badgeClass: 'bg-blue-500/15 text-blue-300 ring-blue-400/20',
      barClass: 'from-blue-400 via-indigo-400 to-violet-400',
    };
  }

  if (score >= 50) {
    return {
      text: 'text-amber-300',
      badge: 'Warning',
      badgeClass: 'bg-amber-500/15 text-amber-300 ring-amber-400/20',
      barClass: 'from-amber-300 via-orange-300 to-amber-500',
    };
  }

  return {
    text: 'text-rose-300',
    badge: 'At Risk',
    badgeClass: 'bg-rose-500/15 text-rose-300 ring-rose-400/20',
    barClass: 'from-rose-300 via-rose-400 to-fuchsia-500',
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.22)]">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <div className="h-56 rounded-[28px] bg-white/[0.06]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-24 rounded-2xl bg-white/[0.06]" />
          <div className="h-24 rounded-2xl bg-white/[0.06]" />
          <div className="h-24 rounded-2xl bg-white/[0.06]" />
          <div className="h-24 rounded-2xl bg-white/[0.06]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="h-28 rounded-2xl bg-white/[0.06]" />
        <div className="h-28 rounded-2xl bg-white/[0.06]" />
        <div className="h-28 rounded-2xl bg-white/[0.06]" />
        <div className="h-28 rounded-2xl bg-white/[0.06]" />
      </div>
    </div>
  );
}

export default function UserExpandedRow({
  user,
  stats,
  isLoading,
  error,
  onRetry,
  onOpenCreditHistory,
  onUserUpdated,
}: UserExpandedRowProps) {
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const tone = getCreditTone(user.credit_score);
  const scorePercent = Math.max(0, Math.min(100, (user.credit_score / 200) * 100));
  const initials = user.full_name?.trim()?.charAt(0)?.toUpperCase() || '?';

  const [isEditing, setIsEditing] = useState(false);
  const [editCreditScore, setEditCreditScore] = useState(user.credit_score);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (editCreditScore === user.credit_score) {
      showToast(t('users.noChanges'), 'info');
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateUserProfile({
        userId: user.id,
        creditScore: editCreditScore,
        currentCreditScore: user.credit_score,
      });
      showToast(t('users.roleUpdateSuccess'), 'success');
      setIsEditing(false);
      onUserUpdated();
    } catch {
      showToast(t('users.updateFailed'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditCreditScore(user.credit_score);
    setIsEditing(false);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="rounded-[28px] border border-rose-500/20 bg-rose-500/10 p-6 text-left">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-300" />
          <div>
            <h3 className="text-base font-semibold text-white">{t('users.detailErrorTitle')}</h3>
            <p className="mt-1 text-sm text-rose-100/80">
              {error ?? t('users.detailErrorFallback')}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              {t('common.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const latestCredit = stats.latestCreditLog;
  const lowCredit = user.credit_score < 60;
  const hasOverdue = stats.overdueBookings > 0;

  return (
    <div className="animate-in slide-in-from-top-1 fade-in duration-200 rounded-[30px] border border-white/10 bg-[#0B1120] p-4 shadow-[0_24px_70px_rgba(2,8,23,0.55)] sm:p-6">
      <div className="grid gap-4 xl:grid-cols-[1.12fr_1fr]">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-[0_18px_55px_rgba(79,70,229,0.3)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-4">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || t('users.unnamed')}
                  className="h-16 w-16 rounded-2xl border border-white/20 object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl font-bold shadow-lg">
                  {initials}
                </div>
              )}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('users.expandedProfile')}
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">{user.full_name || t('users.unnamed')}</h3>
                <p className="mt-1 text-sm text-white/80">{user.email}</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium capitalize ring-1 ring-white/15">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {getRoleLabel(user.role, t)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onOpenCreditHistory}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                <Star className="h-4 w-4 text-amber-500" />
                {t('users.viewCreditHistory')}
                <ArrowUpRight className="h-4 w-4" />
              </button>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-white/20"
                >
                  <Pencil className="h-4 w-4" />
                  {t('users.editCreditAction')}
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/70">{t('users.currentCreditScore')}</p>
              <div className="mt-2 flex items-end gap-3">
                <p className={cn('text-5xl font-bold tracking-tight', tone.text)}>{user.credit_score}</p>
                <span className="pb-1 text-sm text-white/75">/ 200</span>
                <span className={cn('mb-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', tone.badgeClass)}>
                  {tone.badge}
                </span>
              </div>
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-300', tone.barClass)}
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-black/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">{t('users.latestCreditEvent')}</p>
              {latestCredit ? (
                <>
                  <p className="mt-2 text-sm font-medium text-white">{getCreditReasonLabel(latestCredit.reason)}</p>
                  <p className="mt-1 text-xs text-white/70">{new Date(latestCredit.created_at).toLocaleString(getIntlLocale(locale))}</p>
                  <p className={cn('mt-2 text-sm font-semibold', latestCredit.delta >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                    {latestCredit.delta >= 0 ? '+' : ''}
                    {latestCredit.delta} {t('common.pointsShort')}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-white/75">{t('users.noCreditChanges')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem icon={GraduationCap} label={t('users.studentId')} value={user.student_id || t('users.notProvided')} />
          <DetailItem icon={Building2} label={t('users.department')} value={user.department || t('users.notProvided')} />
          <DetailItem icon={Phone} label={t('compensation.phone')} value={user.phone || t('users.notProvided')} />
          <DetailItem icon={CalendarDays} label={t('users.joined')} value={new Date(user.created_at).toLocaleDateString(getIntlLocale(locale))} />
          <DetailItem icon={Mail} label={t('compensation.email')} value={user.email} />
          <DetailItem icon={Star} label={t('users.creditLevel')} value={tone.badge} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('users.totalBookings')} value={stats.totalBookings} hint={t('users.totalBookingsHint')} />
        <StatCard label={t('users.openBookings')} value={stats.openBookings} hint={t('users.openBookingsHint')} />
        <StatCard label={t('users.overdueCases')} value={stats.overdueBookings} hint={t('users.overdueCasesHint')} />
        <StatCard label={t('users.damageReports')} value={stats.damageReports} hint={t('users.damageReportsHint')} />
      </div>

      {(lowCredit || hasOverdue) && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {lowCredit && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-300" />
              <div>
                <p className="text-sm font-semibold text-amber-200">{t('users.creditAttentionTitle')}</p>
                <p className="mt-1 text-sm text-amber-50/80">
                  {t('users.creditAttentionBody')}
                </p>
              </div>
            </div>
          )}
          {hasOverdue && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
              <BookCopy className="mt-0.5 h-4 w-4 text-rose-300" />
              <div>
                <p className="text-sm font-semibold text-rose-200">{t('users.overdueHistoryTitle')}</p>
                <p className="mt-1 text-sm text-rose-50/80">
                  {t('users.overdueHistoryBody', { count: stats.overdueBookings })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 内联编辑面板：角色只读，信用分可调整 */}
      {isEditing && (
        <div className="mt-4 rounded-[24px] border border-violet-400/20 bg-violet-500/[0.07] p-5">
          <p className="mb-4 text-sm font-semibold text-violet-200">{t('users.roleModalTitle')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">
                {t('users.userRole')}
              </label>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white">
                {getRoleLabel(user.role, t)}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {t('users.roleManagedByWhitelist')}
              </p>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">
                {t('users.creditScore')} (0 – 200)
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={editCreditScore}
                onChange={(e) => setEditCreditScore(Number(e.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white focus:border-violet-400/40 focus:outline-none"
              />
              {editCreditScore < 60 && (
                <p className="mt-1.5 text-xs text-amber-300">{t('users.criticalScore')}</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isSaving ? '...' : t('common.save')}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
