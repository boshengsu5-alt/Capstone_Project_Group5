'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  MailCheck,
  Languages,
  Loader2,
  ShieldCheck,
  UserRoundPlus,
} from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  ADMIN_ALREADY_REGISTERED_ERROR_CODE,
  ADMIN_NAME_MISMATCH_ERROR_CODE,
  ADMIN_WHITELIST_ERROR_CODE,
  registerAdmin,
  verifyAdminRegistrationIdentity,
  type VerifiedAdminIdentity,
} from '@/lib/auth';

type RegisterStep = 1 | 2 | 3;

export default function RegisterPage() {
  const { t, locale, setLocale } = useLanguage();
  const [step, setStep] = useState<RegisterStep>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifiedIdentity, setVerifiedIdentity] = useState<VerifiedAdminIdentity | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const mapRegistrationError = (message?: string) => {
    if (message === ADMIN_WHITELIST_ERROR_CODE) {
      return t('register.errors.notWhitelisted');
    }

    if (message === ADMIN_NAME_MISMATCH_ERROR_CODE) {
      return t('register.errors.nameMismatch');
    }

    if (message === ADMIN_ALREADY_REGISTERED_ERROR_CODE) {
      return t('register.errors.alreadyRegistered');
    }

    return message || t('register.errors.unexpected');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim()) {
      setError(t('register.errors.missingIdentity'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('register.errors.invalidEmail'));
      return;
    }

    setIsVerifying(true);

    try {
      const { data, error } = await verifyAdminRegistrationIdentity(fullName, email);
      if (error || !data) {
        setError(mapRegistrationError(error?.message));
        return;
      }

      setVerifiedIdentity(data);
      setPassword('');
      setConfirmPassword('');
      setStep(2);
    } catch {
      setError(t('register.errors.unexpected'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!verifiedIdentity) {
      setError(t('register.errors.identityRequired'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('register.errors.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('register.errors.passwordTooShort'));
      return;
    }

    setIsRegistering(true);

    try {
      const { error } = await registerAdmin(
        verifiedIdentity.fullName,
        verifiedIdentity.email,
        password
      );

      if (error) {
        setError(mapRegistrationError(error.message));
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setStep(3);
    } catch {
      setError(t('register.errors.unexpected'));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleBack = () => {
    setError('');
    setPassword('');
    setConfirmPassword('');
    setStep(1);
  };

  const getRoleLabel = (role?: VerifiedAdminIdentity['role']) => {
    return role === 'admin' ? t('register.roles.admin') : t('register.roles.staff');
  };

  const renderVerifiedSummary = () => {
    if (!verifiedIdentity) return null;

    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          {t('register.verifiedCardTitle')}
        </div>
        <div className="space-y-1.5 text-sm text-gray-300">
          <p>
            {t('register.fullName')}: {verifiedIdentity.fullName}
          </p>
          <p>
            {t('register.email')}: {verifiedIdentity.email}
          </p>
          <p>
            {t('register.roleLabel')}: {getRoleLabel(verifiedIdentity.role)}
          </p>
        </div>
      </div>
    );
  };

  const renderStepOne = () => (
    <form onSubmit={handleVerify} className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
          {t('register.stepLabel', { current: 1 })}
        </p>
        <h2 className="text-xl font-semibold text-white">{t('register.identityStepTitle')}</h2>
        <p className="text-sm leading-6 text-gray-400">{t('register.identityStepSubtitle')}</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-300">
          {t('register.fullName')}
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t('register.fullNamePlaceholder')}
          className="w-full rounded-xl border border-white/10 bg-gray-800/60 px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-all focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-gray-300">
          {t('register.email')}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('register.emailPlaceholder')}
          className="w-full rounded-xl border border-white/10 bg-gray-800/60 px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-all focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
        />
      </div>

      <button
        type="submit"
        disabled={isVerifying || !fullName.trim() || !email.trim()}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all hover:bg-indigo-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isVerifying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('register.verifying')}
          </>
        ) : (
          <>
            <MailCheck className="h-4 w-4" />
            {t('register.verifyAction')}
          </>
        )}
      </button>
    </form>
  );

  const renderStepTwo = () => (
    <form onSubmit={handleRegister} className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
          {t('register.stepLabel', { current: 2 })}
        </p>
        <h2 className="text-xl font-semibold text-white">{t('register.credentialsStepTitle')}</h2>
        <p className="text-sm leading-6 text-gray-400">{t('register.credentialsStepSubtitle')}</p>
      </div>

      {renderVerifiedSummary()}

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-gray-300">
          {t('register.password')}
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('register.passwordPlaceholder')}
            className="w-full rounded-xl border border-white/10 bg-gray-800/60 px-4 py-2.5 pr-12 text-sm text-white placeholder-gray-600 transition-all focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
          {t('register.confirmPassword')}
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('register.confirmPasswordPlaceholder')}
            className="w-full rounded-xl border border-white/10 bg-gray-800/60 px-4 py-2.5 pr-12 text-sm text-white placeholder-gray-600 transition-all focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? t('register.hidePassword') : t('register.showPassword')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={isRegistering}
          className="inline-flex min-w-[112px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('register.backAction')}
        </button>

        <button
          type="submit"
          disabled={isRegistering || !password || !confirmPassword}
          className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all hover:bg-indigo-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRegistering ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('register.registering')}
            </span>
          ) : (
            t('register.submit')
          )}
        </button>
      </div>
    </form>
  );

  const renderStepThree = () => (
    <div className="space-y-5 text-center">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
          {t('register.stepLabel', { current: 3 })}
        </p>
        <h2 className="text-xl font-semibold text-white">{t('register.successStepTitle')}</h2>
      </div>

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 text-3xl font-semibold text-emerald-300">
        ✓
      </div>

      <div className="space-y-2">
        <p className="text-lg font-semibold text-white">
          {t('register.successWelcome', {
            name: verifiedIdentity?.fullName || fullName.trim(),
          })}
        </p>
        <p className="text-sm leading-6 text-gray-400">{t('register.successStepMessage')}</p>
      </div>

      {renderVerifiedSummary()}

      <Link
        href="/login"
        className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all hover:bg-indigo-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
      >
        {t('register.loginAction')}
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
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

        <div className="mb-10 flex flex-col items-center">
          <div className="mb-4 rounded-2xl bg-indigo-600 p-3 shadow-[0_0_40px_rgba(99,102,241,0.4)]">
            <UserRoundPlus className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('register.title')}</h1>
          <p className="mt-2 text-center text-sm leading-6 text-gray-500">{t('register.subtitle')}</p>
        </div>

        <div className="rounded-3xl border border-white/8 bg-gray-900/60 p-8 shadow-2xl backdrop-blur-xl">
          <div className="space-y-5">
            {error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                {error}
              </div>
            ) : null}

            {step === 1 ? renderStepOne() : null}
            {step === 2 ? renderStepTwo() : null}
            {step === 3 ? renderStepThree() : null}

            {step !== 3 ? (
              <>
                <p className="text-xs leading-5 text-gray-500">
                  {t('register.whitelistHint')}
                </p>

                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-gray-400">
                  <span>{t('register.haveAccount')}</span>{' '}
                  <Link href="/login" className="font-semibold text-indigo-300 transition hover:text-indigo-200">
                    {t('register.loginAction')}
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          {t('register.footer')}
        </p>
      </div>
    </div>
  );
}
