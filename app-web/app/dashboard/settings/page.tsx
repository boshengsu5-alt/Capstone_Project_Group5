'use client';

import React, { useEffect, useState } from 'react';
import { User, Mail, Shield, CheckCircle2, Globe, Monitor, Lock, Bell, Clock, Languages } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import AvatarUpload from '@/components/settings/AvatarUpload';

export default function SettingsPage() {
  const { t, locale, setLocale } = useLanguage();
  const [user, setUser] = useState<any>(null);
  
  // Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification State
  const [notifs, setNotifs] = useState({
    push: true,
    overdue: true
  });

  useEffect(() => {
    async function loadUser() {
      const u = await getCurrentUser();
      setUser(u);
    }
    loadUser();

    // Load notif settings
    const saved = localStorage.getItem('unigear_notif_settings');
    if (saved) {
      try {
        setNotifs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse notif settings');
      }
    }
  }, []);

  const handleToggleNotif = (key: 'push' | 'overdue') => {
    const newState = { ...notifs, [key]: !notifs[key] };
    setNotifs(newState);
    localStorage.setItem('unigear_notif_settings', JSON.stringify(newState));
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match! / 两次输入密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters. / 密码长度至少为 6 位');
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert('Password updated successfully! / 密码修改成功！');
      setShowPasswordForm(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-[#050505] text-gray-100 overflow-y-auto font-sans selection:bg-purple-500/30">
      <Header />

      <main className="flex-1 px-6 lg:px-10 max-w-[1600px] w-full space-y-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        
        {/* Row 1: Header/Avatar Card */}
        <section className="bg-gray-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all duration-500">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-600/20 transition-all duration-700" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <AvatarUpload 
              currentAvatarUrl={user?.user_metadata?.avatar_url} 
              onUploadSuccess={(url) => {
                setUser({ ...user, user_metadata: { ...user.user_metadata, avatar_url: url } });
              }}
            />
            <div className="text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {user?.email?.split('@')[0].toUpperCase() || 'ADMIN USER'}
                </h1>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase tracking-widest">
                  Administrator
                </span>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </div>
              </div>
              <p className="text-lg text-purple-300/60 font-medium max-w-md">
                {user?.email || 'admin@unigear.edu'} • {t('settings.subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Row 2: Grid (Security + Notifications) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Change Password Card */}
          <section className="bg-gray-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-xl flex flex-col hover:border-purple-500/30 transition-all duration-500">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Lock size={20} />
                </div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">{t('settings.security')}</h2>
              </div>
              {!showPasswordForm && (
                <button 
                  onClick={() => setShowPasswordForm(true)}
                  className="text-purple-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest bg-purple-500/10 px-4 py-2 rounded-lg border border-purple-500/20"
                >
                  Edit Security
                </button>
              )}
            </div>

            {showPasswordForm ? (
              <form onSubmit={handlePasswordUpdate} className="space-y-6 animate-in zoom-in-95 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Shield size={12} /> New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-600 outline-none transition-all placeholder:text-gray-700"
                    placeholder="ENTER SECURE PASS"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <CheckCircle2 size={12} /> Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-600 outline-none transition-all placeholder:text-gray-700"
                    placeholder="RE-TYPE PASS"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 font-bold tracking-widest uppercase text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-[2] py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-bold tracking-widest uppercase text-xs shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {passwordLoading ? 'Encrypting...' : 'Update Password'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center space-y-4 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                <div className="p-4 rounded-full bg-gray-800/50 text-gray-600">
                  <Shield size={32} />
                </div>
                <p className="text-sm text-gray-500 max-w-[240px]">
                  Your account is protected by hardware encryption. Click the button above to cycle your security credentials.
                </p>
              </div>
            )}
          </section>

          {/* Notifications Card */}
          <section className="bg-gray-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-xl hover:border-purple-500/30 transition-all duration-500">
            <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Bell size={20} />
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">{t('settings.notifications')}</h2>
            </div>

            <div className="space-y-6">
              {[
                { key: 'push', label: 'Application Push', sub: 'Real-time dashboard alerts', icon: Monitor },
                { key: 'overdue', label: 'Overdue Reminders', sub: 'Automated asset follow-up', icon: Clock }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group/toggle">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-all duration-500 ${notifs[item.key as keyof typeof notifs] ? 'bg-purple-600/20 text-purple-400' : 'bg-gray-800 text-gray-600 group-hover/toggle:bg-gray-700'}`}>
                      <item.icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white tracking-wide">{item.label}</h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-tight">{item.sub}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleToggleNotif(item.key as 'push' | 'overdue')}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${notifs[item.key as keyof typeof notifs] ? 'bg-purple-600 ring-2 ring-purple-500/20' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-lg ${notifs[item.key as keyof typeof notifs] ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              ))}
              
              <div className="p-4 bg-amber-400/5 rounded-2xl border border-amber-400/10 mt-4">
                <p className="text-[10px] text-amber-200/60 leading-relaxed font-medium flex items-start gap-2">
                  <div className="mt-0.5"><Shield size={12} /></div>
                  Notification preferences are stored locally to ensure zero-latency delivery. Global server sync is coming in v2.0.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Row 3: Language Card */}
        <section className="bg-gray-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-xl hover:border-purple-500/30 transition-all duration-500">
           <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Globe size={20} />
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">{t('settings.appearance')}</h2>
            </div>
            
            <div 
              className="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 bg-black/20 rounded-2xl border border-white/5 cursor-pointer group/lang" 
              onClick={toggleLanguage}
            >
              <div className="flex items-center gap-6 text-center sm:text-left">
                <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover/lang:bg-indigo-500 group-hover/lang:text-white transition-all duration-500 shadow-lg group-hover/lang:shadow-indigo-500/20">
                  <Languages size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-widest uppercase">{t('settings.language')}</h3>
                  <p className="text-sm text-gray-500 mt-1">{locale === 'zh' ? '当前系统语言: 简体中文' : 'Current System Language: English (US)'}</p>
                </div>
              </div>
              <div className="px-8 py-3 rounded-xl border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-[0.3em] group-hover/lang:bg-indigo-500 group-hover/lang:text-white group-hover/lang:border-indigo-500 transition-all duration-300">
                {t('common.switchLang')}
              </div>
            </div>
        </section>

      </main>
    </div>
  );
}
