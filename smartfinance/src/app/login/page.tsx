'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Lock, Mail, ArrowRight, AlertCircle, Send } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { t, refreshUser } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isTelegramAvailable, setIsTelegramAvailable] = useState(false);

  // Auto-login if inside Telegram WebApp
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
      setIsTelegramAvailable(true);
      handleTelegramLogin();
    }
  }, []);

  const handleTelegramLogin = async () => {
    if (typeof window === 'undefined' || !window.Telegram?.WebApp?.initData) return;
    setTelegramLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: window.Telegram.WebApp.initData }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Telegram authentication failed');
      }

      await refreshUser();
      router.push('/');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Telegram kirishda xatolik yuz berdi');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('auth.invalidCredentials'));
      }

      await refreshUser();
      router.push('/');
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setErrorMsg((err as any)?.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('auth.signIn')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('auth.loginWelcome')}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isTelegramAvailable && (
        <div className="mb-5">
          <button
            type="button"
            onClick={handleTelegramLogin}
            disabled={telegramLoading}
            className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-md shadow-sky-500/20 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4 rotate-45" />
            <span>{telegramLoading ? 'Telegram orqali kirilmoqda...' : 'Telegram orqali kirish'}</span>
          </button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-medium">yoki</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t('auth.email')}
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('auth.password')}
            </label>
            <Link
              href="/reset-password"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
        >
          <span>{loading ? t('common.loading') : t('auth.login')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('auth.dontHaveAccount')}{' '}
          <Link
            href="/register"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t('auth.signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
}
