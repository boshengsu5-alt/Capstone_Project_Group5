'use client';

import React, { useEffect, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  User, Mail, Shield, Lock, Bell, Globe,
  Calendar, CheckCircle2, Loader2, BookOpen,
  Clock, AlertTriangle, RotateCcw, Languages,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import AvatarUpload from '@/components/settings/AvatarUpload';
import { useAuth } from '@/components/providers/AuthContext';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useToast } from '@/components/ui/Toast';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ============================================================
// Types & Constants. 类型与常量
// ============================================================

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

const NOTIF_ITEMS: Array<{
  key: keyof NotifSettings;
  icon: React.ElementType;
  label: string;
  sub: string;
}> = [
  { key: 'booking_approved', icon: BookOpen,      label: 'Booking Approval Alerts',       sub: 'Notify when a booking request is approved or rejected' },
  { key: 'overdue_reminder', icon: Clock,          label: 'Overdue Reminders',              sub: 'Automated follow-up for overdue asset returns' },
  { key: 'damage_report',    icon: AlertTriangle,  label: 'Damage Report Submitted',        sub: 'Alert when a new damage report is filed' },
  { key: 'return_pending',   icon: RotateCcw,      label: 'Return Verification Pending',    sub: 'Notify when an asset return awaits verification' },
];

const NAV_ITEMS: Array<{ key: Section; label: string; icon: React.ElementType }> = [
  { key: 'profile',       label: 'Profile',       icon: User   },
  { key: 'security',      label: 'Security',      icon: Lock   },
  { key: 'notifications', label: 'Notifications', icon: Bell   },
  { key: 'appearance',    label: 'Appearance',    icon: Globe  },
];

// ============================================================
// Shared input style. 共用输入框样式
// ============================================================

const inputCls  = 'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-600 outline-none transition-all placeholder:text-gray-600 text-sm';
const readonlyCls = 'w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-gray-400 text-sm select-none';

// ============================================================
// Page Component. 页面组件
// ============================================================

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const { showToast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [active, setActive] = useState<Section>('profile');

  // Profile
  const [fullName, setFullName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState<NotifSettings>(DEFAULT_NOTIFS);

  useEffect(() => {
    getCurrentUser().then(setUser);
    const saved = localStorage.getItem('unigear_notif_settings');
    if (saved) {
      try { setNotifs({ ...DEFAULT_NOTIFS, ...JSON.parse(saved) }); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => { setFullName(profile?.full_name ?? ''); }, [profile?.full_name]);

  // ── Handlers ─────────────────────────────────────────────

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (!user || !trimmed || trimmed === profile?.full_name) return;
    setProfileSaving(true);
    try {
      const { error } = await (supabase as any).from('profiles').update({ full_name: trimmed }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile.', 'error');
    } finally { setProfileSaving(false); }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { showToast('Passwords do not match.', 'error'); return; }
    if (newPassword.length < 6)          { showToast('Password must be at least 6 characters.', 'error'); return; }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('Password updated successfully!', 'success');
      setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update password.', 'error');
    } finally { setPasswordSaving(false); }
  };

  const handleToggleNotif = (key: keyof NotifSettings) => {
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);
    localStorage.setItem('unigear_notif_settings', JSON.stringify(next));
  };

  // ── Derived values ────────────────────────────────────────

  const roleLabel =
    profile?.role === 'admin' ? 'Administrator'
    : profile?.role === 'staff' ? 'Staff'
    : 'Student';

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const lastLogin = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const profileUnchanged = !fullName.trim() || fullName.trim() === (profile?.full_name ?? '');

  // ============================================================
  // Section renderers. 各区块渲染函数
  // ============================================================

  const renderProfile = () => (
    <form onSubmit={handleSaveProfile} className="h-full flex flex-col">
      <SectionHeader icon={User} title={t('settings.profileSection')} />
      <div className="flex-1 flex flex-col gap-6 pt-6">
        <div className="flex items-start gap-8">
          <AvatarUpload
            currentAvatarUrl={profile?.avatar_url || user?.user_metadata?.avatar_url}
            onUploadSuccess={(url) => {
              // 用 || 而非 ?? 是因为 profile.avatar_url 初始值为空字符串，?? 不会跳过它
              setUser((u) => u ? { ...u, user_metadata: { ...u.user_metadata, avatar_url: url } } : u);
              // 刷新 profile 使数据库中的新 avatar_url 同步到全局状态
              refreshProfile();
            }}
          />
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Display Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="Your display name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5"><Mail size={11} /> {t('settings.emailLabel')}</label>
              <div className={readonlyCls}>{user?.email ?? '—'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5"><Shield size={11} /> {t('settings.roleLabel')}</label>
              <div className={readonlyCls}>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-widest">{roleLabel}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5"><Calendar size={11} /> Member Since</label>
              <div className={readonlyCls}>{memberSince}</div>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-auto">
          <SaveBtn loading={profileSaving} disabled={profileUnchanged} />
        </div>
      </div>
    </form>
  );

  const renderSecurity = () => (
    <div className="h-full flex flex-col">
      <SectionHeader icon={Lock} title="Security" />
      <div className="flex-1 flex flex-col gap-6 pt-6">
        {/* Session info row */}
        <div className="grid grid-cols-2 gap-4">
          <InfoCard label="Last Sign In" value={lastLogin} />
          <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">{t('settings.statusLabel')}</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-emerald-400 font-medium">{t('settings.activeStatus')}</span>
            </div>
          </div>
        </div>
        {/* Change password */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Change Password</p>
          <form onSubmit={handlePasswordUpdate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">New Password</label>
              <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} placeholder="Enter new password" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Confirm Password</label>
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} placeholder="Re-enter new password" />
            </div>
            <div className="col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordSaving || !newPassword || !confirmPassword}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-bold transition-all"
              >
                {passwordSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="h-full flex flex-col">
      <SectionHeader icon={Bell} title="Notification Preferences" />
      <div className="flex-1 flex flex-col gap-3 pt-6">
        {NOTIF_ITEMS.map(({ key, icon: Icon, label, sub }) => (
          <div key={key} className="flex items-center justify-between p-4 bg-black/20 hover:bg-white/[0.04] border border-white/5 rounded-xl transition-colors">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg transition-colors', notifs[key] ? 'bg-purple-500/15 text-purple-400' : 'bg-gray-800 text-gray-500')}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            </div>
            <button
              onClick={() => handleToggleNotif(key)}
              aria-label={`Toggle ${label}`}
              className={cn('relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300', notifs[key] ? 'bg-purple-600 ring-2 ring-purple-500/20' : 'bg-gray-700')}
            >
              <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300', notifs[key] ? 'left-6' : 'left-1')} />
            </button>
          </div>
        ))}
        <p className="text-xs text-gray-600 pt-2">Notification preferences are stored locally in this browser.</p>
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="h-full flex flex-col">
      <SectionHeader icon={Globe} title={t('settings.appearance')} />
      <div className="flex-1 flex flex-col gap-4 pt-6">
        <div className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400"><Languages size={16} /></div>
            <div>
              <p className="text-sm font-semibold text-white">{t('settings.language')}</p>
              <p className="text-xs text-gray-500">{locale === 'zh' ? '当前语言：简体中文' : 'Current language: English (US)'}</p>
            </div>
          </div>
          <button
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            className="px-4 py-2 rounded-xl border border-indigo-500/30 text-indigo-400 text-xs font-bold tracking-widest hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all whitespace-nowrap"
          >
            {t('common.switchLang')}
          </button>
        </div>
      </div>
    </div>
  );

  const sectionContent: Record<Section, React.ReactNode> = {
    profile:       renderProfile(),
    security:      renderSecurity(),
    notifications: renderNotifications(),
    appearance:    renderAppearance(),
  };

  // ============================================================
  // Layout: left nav + right content. 两栏布局
  // ============================================================

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-[#050505] text-gray-100 font-sans overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left nav ────────────────────────────── */}
        <aside className="w-52 flex-shrink-0 border-r border-white/5 flex flex-col py-8 px-3 gap-1">
          <div className="px-3 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('settings.title')}</p>
          </div>
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                active === key
                  ? 'bg-purple-600/15 text-purple-300 ring-1 ring-purple-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </aside>

        {/* ── Right content ────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-10">
          <div className="max-w-2xl h-full">
            {sectionContent[active]}
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// Small reusable sub-components. 小型复用子组件
// ============================================================

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-5 border-b border-white/5">
      <Icon size={16} className="text-purple-400" />
      <h2 className="text-base font-bold text-white">{title}</h2>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-200 font-medium">{value}</p>
    </div>
  );
}

function SaveBtn({ loading, disabled }: { loading: boolean; disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-bold transition-all"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
      Save Changes
    </button>
  );
}
