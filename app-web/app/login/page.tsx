'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ADMIN_WHITELIST_ERROR_CODE,
  checkDashboardAccess,
  setSessionCookie,
  signIn,
  signOut,
} from '@/lib/auth';
import { LayoutDashboard, Eye, EyeOff, Loader2, Languages } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error } = await signIn(email, password);
      if (error) {
        setError(
          error.message === ADMIN_WHITELIST_ERROR_CODE
            ? t('login.errors.adminWhitelistRequired')
            : error.message || t('login.errors.invalidCredentials')
        );
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError(t('login.errors.missingUser'));
        return;
      }

      const hasAccess = await checkDashboardAccess(userId);
      if (!hasAccess) {
        await signOut();
        setError(t('login.errors.accessDenied'));
        return;
      }

      setSessionCookie();
      router.push('/dashboard');
    } catch {
      setError(t('login.errors.unexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      {/* Background grid */}
      <div 
        className="fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <div className="relative w-full max-w-md">
        <div className="absolute right-0 -top-16">
          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-300 transition hover:bg-white/10"
          >
            <Languages className="h-3.5 w-3.5" />
            {t('common.switchLang')}
          </button>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.4)] mb-4">
            <LayoutDashboard className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('login.title')}</h1>
          <p className="text-gray-500 text-sm mt-2">{t('login.subtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/8 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                className="w-full bg-gray-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="off"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  className="w-full bg-gray-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('login.signingIn')}
                </>
              ) : (
                t('login.submit')
              )}
            </button>

            <p className="text-xs leading-5 text-gray-500">
              {t('login.whitelistHint')}
            </p>

            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-gray-400">
              <span>{t('login.noAccount')}</span>{' '}
              <Link href="/register" className="font-semibold text-indigo-300 transition hover:text-indigo-200">
                {t('login.registerAction')}
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          {t('login.footer')}
        </p>
      </div>
    </div>
  );
}
