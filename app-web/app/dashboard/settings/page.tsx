'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  User, Mail, Shield, Lock, Bell, Globe,
  Calendar, CheckCircle2, Loader2, BookOpen,
  Clock, AlertTriangle, RotateCcw, Languages, Settings2,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import AvatarUpload from '@/components/settings/AvatarUpload';
import { useAuth } from '@/components/providers/AuthContext';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useToast } from '@/components/ui/Toast';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { getIntlLocale, getRoleLabel } from '@/lib/i18n';

type Section = 'profile' | 'security' | 'notifications' | 'appearance';

interface NotifSettings {
  booking_approved: boolean;
  overdue_reminder: boolean;
  damage_report: boolean;
  return_pending: boolean;
}

const DEFAULT_NOTIFS: NotifSettings = {
  booking_approved: true,
  overdue_reminder: true,
  damage_report: true,
  return_pending: true,
};

const inputCls = 'dashboard-field px-4 py-3 text-sm';
const readonlyCls = 'dashboard-field select-none border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-gray-300/85';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const { showToast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [active, setActive] = useState<Section>('profile');

  const [fullName, setFullName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [notifs, setNotifs] = useState<NotifSettings>(DEFAULT_NOTIFS);
  const notifItems = [
    { key: 'booking_approved', icon: BookOpen, label: t('settings.notifications.bookingApproved.label'), sub: t('settings.notifications.bookingApproved.sub') },
    { key: 'overdue_reminder', icon: Clock, label: t('settings.notifications.overdueReminder.label'), sub: t('settings.notifications.overdueReminder.sub') },
    { key: 'damage_report', icon: AlertTriangle, label: t('settings.notifications.damageReport.label'), sub: t('settings.notifications.damageReport.sub') },
    { key: 'return_pending', icon: RotateCcw, label: t('settings.notifications.returnPending.label'), sub: t('settings.notifications.returnPending.sub') },
  ] as const;
  const navItems = [
    { key: 'profile', label: t('settings.navProfile'), icon: User },
    { key: 'security', label: t('settings.navSecurity'), icon: Lock },
    { key: 'notifications', label: t('settings.navNotifications'), icon: Bell },
    { key: 'appearance', label: t('settings.navAppearance'), icon: Globe },
  ] as const;

  useEffect(() => {
    getCurrentUser().then(setUser);
    const saved = localStorage.getItem('unigear_notif_settings');
    if (saved) {
      try {
        setNotifs({ ...DEFAULT_NOTIFS, ...JSON.parse(saved) });
      } catch {
        // Ignore malformed local data and keep defaults.
      }
    }
  }, []);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
  }, [profile?.full_name]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (!user || !trimmed || trimmed === profile?.full_name) return;

    setProfileSaving(true);
    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({ full_name: trimmed })
        .eq('id', user.id);
      if (error) throw error;

      await refreshProfile();
      showToast(t('settings.saveProfileSuccess'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('settings.saveProfileFailed'), 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast(t('settings.passwordMismatch'), 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast(t('settings.passwordTooShort'), 'error');
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast(t('settings.passwordSuccess'), 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('settings.passwordFailed'), 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleToggleNotif = (key: keyof NotifSettings) => {
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);
    localStorage.setItem('unigear_notif_settings', JSON.stringify(next));
  };

  const roleLabel = getRoleLabel(profile?.role ?? 'student', t);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(getIntlLocale(locale), { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const lastLogin = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString(getIntlLocale(locale), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const profileUnchanged = !fullName.trim() || fullName.trim() === (profile?.full_name ?? '');
  const enabledNotifCount = Object.values(notifs).filter(Boolean).length;

  const summaryCards = useMemo(() => [
    {
      label: t('settings.roleLabel'),
      value: roleLabel,
      hint: t('settings.activeStatus'),
      tone: 'border-amber-400/16 bg-amber-500/[0.06]',
    },
    {
      label: t('settings.emailLabel'),
      value: user?.email ?? '—',
      hint: t('settings.accountSettings'),
      tone: 'border-violet-400/16 bg-violet-500/[0.06]',
    },
    {
      label: t('settings.memberSince'),
      value: memberSince,
      hint: t('settings.profileSection'),
      tone: 'border-sky-400/16 bg-sky-500/[0.06]',
    },
    {
      label: t('settings.notificationsSection'),
      value: `${enabledNotifCount}/4`,
      hint: t('settings.notifStoredNote'),
      tone: 'border-emerald-400/16 bg-emerald-500/[0.06]',
    },
  ], [enabledNotifCount, memberSince, roleLabel, t, user?.email]);

  const renderProfile = () => (
    <form onSubmit={handleSaveProfile} className="flex flex-col gap-8">
      <SectionHeader icon={User} title={t('settings.profileSection')} description={t('settings.subtitle')} />
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="dashboard-panel-muted rounded-[28px] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--dashboard-text-muted)]">
            {t('settings.profileSection')}
          </p>
          <div className="mt-6 flex justify-center">
            <AvatarUpload
              currentAvatarUrl={profile?.avatar_url || user?.user_metadata?.avatar_url}
              onUploadSuccess={(url) => {
                setUser((u) => u ? { ...u, user_metadata: { ...u.user_metadata, avatar_url: url } } : u);
                void refreshProfile();
              }}
            />
          </div>
          <div className="mt-6 space-y-3 text-center">
            <p className="text-lg font-semibold text-white">{profile?.full_name || roleLabel}</p>
            <p className="truncate text-sm text-[color:var(--dashboard-text-muted)]">{user?.email ?? '—'}</p>
            <div className="inline-flex rounded-full border border-amber-400/16 bg-amber-500/[0.08] px-3 py-1 text-xs font-semibold tracking-[0.18em] text-amber-200">
              {roleLabel}
            </div>
          </div>
        </div>

        <div className="dashboard-panel rounded-[28px] p-6 lg:p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t('settings.displayName')}>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputCls}
                placeholder={t('settings.displayNamePlaceholder')}
              />
            </Field>
            <Field label={t('settings.emailLabel')} icon={Mail}>
              <div className={readonlyCls}>{user?.email ?? '—'}</div>
            </Field>
            <Field label={t('settings.roleLabel')} icon={Shield}>
              <div className={readonlyCls}>
                <span className="inline-flex rounded-full border border-violet-400/16 bg-violet-500/[0.08] px-3 py-1 text-xs font-semibold tracking-[0.18em] text-violet-200">
                  {roleLabel}
                </span>
              </div>
            </Field>
            <Field label={t('settings.memberSince')} icon={Calendar}>
              <div className={readonlyCls}>{memberSince}</div>
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveBtn loading={profileSaving} disabled={profileUnchanged} />
      </div>
    </form>
  );

  const renderSecurity = () => (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={Lock} title={t('settings.securitySection')} description={t('settings.changePassword')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard label={t('settings.lastSignIn')} value={lastLogin} />
        <div className="dashboard-panel rounded-[24px] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--dashboard-text-muted)]">{t('settings.statusLabel')}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">{t('settings.activeStatus')}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-panel rounded-[28px] p-6 lg:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--dashboard-text-muted)]">{t('settings.changePassword')}</p>
        <form onSubmit={handlePasswordUpdate} className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label={t('settings.newPassword')}>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
              placeholder={t('settings.newPasswordPlaceholder')}
            />
          </Field>
          <Field label={t('settings.confirmPassword')}>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
              placeholder={t('settings.confirmPasswordPlaceholder')}
            />
          </Field>
          <div className="flex justify-end md:col-span-2">
            <button
              type="submit"
              disabled={passwordSaving || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 px-5 py-3 text-sm font-semibold text-[#120d05] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {passwordSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              {t('settings.updatePassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={Bell} title={t('settings.notificationsSection')} description={t('settings.notifStoredNote')} />
      <div className="space-y-4">
        {notifItems.map(({ key, icon: Icon, label, sub }) => (
          <div key={key} className="dashboard-panel rounded-[26px] p-5 transition-colors hover:bg-white/[0.045]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors',
                  notifs[key]
                    ? 'border-amber-400/18 bg-amber-500/[0.08] text-amber-300'
                    : 'border-white/10 bg-white/[0.03] text-gray-500'
                )}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="mt-1 text-sm text-[color:var(--dashboard-text-muted)]">{sub}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleNotif(key)}
                aria-label={label}
                className={cn(
                  'relative h-7 w-14 rounded-full border transition-all duration-300',
                  notifs[key] ? 'border-amber-400/18 bg-amber-500/80' : 'border-white/10 bg-white/[0.08]'
                )}
              >
                <div className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-300',
                  notifs[key] ? 'left-8' : 'left-1'
                )} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={Globe} title={t('settings.appearance')} description={t('settings.language')} />
      <div className="dashboard-panel rounded-[28px] p-6 lg:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/18 bg-sky-500/[0.08] text-sky-300">
              <Languages size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t('settings.language')}</p>
              <p className="mt-1 text-sm text-[color:var(--dashboard-text-muted)]">
                {locale === 'zh' ? t('settings.languageValueZh') : t('settings.languageValueEn')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-gray-100 transition hover:bg-white/[0.08]"
          >
            {t('common.switchLang')}
          </button>
        </div>
      </div>
    </div>
  );

  const sectionContent: Record<Section, React.ReactNode> = {
    profile: renderProfile(),
    security: renderSecurity(),
    notifications: renderNotifications(),
    appearance: renderAppearance(),
  };

  return (
    <div className="dashboard-shell flex h-full w-full flex-1 flex-col overflow-hidden text-gray-100">
      <Header />

      <main className="dashboard-scrollbar mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-8 overflow-y-auto p-6 lg:p-10">
        <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="dashboard-icon-frame rounded-2xl p-3">
                <Settings2 className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-300">{t('header.settings')}</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{t('settings.title')}</h1>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-[color:var(--dashboard-text-muted)]">
              {t('settings.subtitle')}
            </p>
          </div>

          <div className="dashboard-panel rounded-[28px] p-4 xl:min-w-[320px]">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--dashboard-text-muted)]">{t('settings.accountSettings')}</p>
            <p className="mt-3 text-lg font-semibold text-white">{profile?.full_name || roleLabel}</p>
            <p className="mt-1 truncate text-sm text-[color:var(--dashboard-text-muted)]">{user?.email ?? '—'}</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className={cn('dashboard-panel rounded-[28px] p-5', card.tone)}>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--dashboard-text-muted)]">{card.label}</p>
              <p className="mt-4 truncate text-2xl font-semibold text-white">{card.value}</p>
              <p className="mt-2 text-sm text-[color:var(--dashboard-text-muted)]">{card.hint}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="dashboard-panel rounded-[32px] p-5">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--dashboard-text-muted)]">{t('settings.title')}</p>
              <p className="mt-3 text-xl font-semibold text-white">{profile?.full_name || roleLabel}</p>
              <p className="mt-1 truncate text-sm text-[color:var(--dashboard-text-muted)]">{user?.email ?? '—'}</p>
            </div>

            <div className="mt-5 space-y-2">
              {navItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActive(key)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all',
                    active === key
                      ? 'border-amber-400/18 bg-gradient-to-r from-amber-500/[0.14] via-white/[0.03] to-transparent text-white'
                      : 'border-transparent text-[color:var(--dashboard-text-muted)] hover:border-white/6 hover:bg-white/[0.04] hover:text-white'
                  )}
                >
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    active === key ? 'bg-amber-500/10 text-amber-300' : 'bg-white/[0.03] text-gray-500'
                  )}>
                    <Icon size={16} />
                  </div>
                  {label}
                </button>
              ))}
            </div>
          </aside>

          <div className="dashboard-panel rounded-[32px] p-6 lg:p-8">
            {sectionContent[active]}
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-white/6 pb-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/16 bg-amber-500/[0.08] text-amber-300">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-[color:var(--dashboard-text-muted)]">{description}</p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--dashboard-text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          {Icon ? <Icon size={12} /> : null}
          {label}
        </span>
      </label>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-panel rounded-[24px] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--dashboard-text-muted)]">{label}</p>
      <p className="mt-4 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function SaveBtn({ loading, disabled }: { loading: boolean; disabled: boolean }) {
  const { t } = useLanguage();
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 px-5 py-3 text-sm font-semibold text-[#120d05] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
      {t('common.saveChanges')}
    </button>
  );
}
