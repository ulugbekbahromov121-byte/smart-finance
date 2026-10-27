'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import QuickAddModal from '@/components/transactions/QuickAddModal';
import {
  LayoutDashboard, ArrowDownLeft, ArrowUpRight, PieChart,
  HandCoins, RefreshCw, BarChart3, Bell, Settings, LogOut,
  Sun, Moon, Plus, Globe, ChevronDown
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, user, unreadCount, theme, toggleTheme, t, refreshUser } = useLanguage();

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // Native Telegram Back Button integration
  useEffect(() => {
    if (typeof window === 'undefined' || !window.Telegram?.WebApp) return;
    const tg = window.Telegram.WebApp;

    if (!tg.BackButton) return;

    const isSubPage = pathname !== '/' && !['/login', '/register', '/reset-password'].includes(pathname);

    if (isSubPage) {
      tg.BackButton.show();
      const onBack = () => {
        router.back();
      };
      tg.BackButton.onClick(onBack);
      return () => {
        tg.BackButton.offClick(onBack);
      };
    } else {
      tg.BackButton.hide();
    }
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('sf_auth_token');
      await refreshUser();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const navItems = [
    { href: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/expenses', label: t('nav.expenses'), icon: ArrowDownLeft },
    { href: '/income', label: t('nav.income'), icon: ArrowUpRight },
    { href: '/budgets', label: t('nav.budgets'), icon: PieChart },
    { href: '/debts', label: t('nav.debts'), icon: HandCoins },
    { href: '/recurring', label: t('nav.recurring'), icon: RefreshCw },
    { href: '/reports', label: t('nav.reports'), icon: BarChart3 },
    { href: '/notifications', label: t('nav.notifications'), icon: Bell, badge: unreadCount },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  // If on login, register or reset password pages, render minimal layout with language picker
  const isAuthPage = ['/login', '/register', '/reset-password'].includes(pathname);
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        <header className="p-4 flex items-center justify-between max-w-6xl mx-auto w-full pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
              $
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">Smart Finance</span>
          </Link>

          <div className="flex items-center space-x-2">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
              >
                <Globe className="w-4 h-4 text-slate-500" />
                <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag}</span>
                <span className="hidden sm:inline">{SUPPORTED_LANGUAGES.find(l => l.code === language)?.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-50">
                  {SUPPORTED_LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3.5 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                        language === l.code ? 'font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-base">{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 sticky top-0 h-screen z-30">
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/25">
              $
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-tight">
                Smart Finance
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                {user?.currency || 'UZS'}
              </span>
            </div>
          </Link>
        </div>

        {/* Quick Add Button */}
        <div className="p-4">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
              }
              setIsQuickAddOpen(true);
            }}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-sm shadow-sm shadow-indigo-600/30 transition group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span>{t('nav.quickAdd')}</span>
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Card */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {user?.fullName || 'User'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title={t('nav.logout')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0">
        {/* TOP BAR */}
        <header className="sticky top-0 z-20 h-14 md:h-16 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between pt-[calc(env(safe-area-inset-top,0px))]">
          <div className="flex items-center space-x-2.5">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs md:text-sm shadow">
                $
              </div>
              <span className="font-bold text-sm md:text-base text-slate-900 dark:text-white">Smart Finance</span>
            </Link>
          </div>

          <div className="hidden md:block">
            <span className="text-xs font-medium text-slate-400">
              {t('app.tagline')}
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-1.5 md:space-x-2">
            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center space-x-1 px-2 py-1 md:px-2.5 md:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition shadow-xs"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag}</span>
                <span className="font-semibold text-[11px] md:text-xs">{SUPPORTED_LANGUAGES.find(l => l.code === language)?.code.toUpperCase()}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-50">
                  {SUPPORTED_LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                        language === l.code ? 'font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-sm">{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <Link
              href="/notifications"
              className="relative p-1.5 md:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition shadow-xs"
              title={t('nav.notifications')}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 md:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition shadow-xs"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Telegram & Mobile Friendly) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 flex items-center justify-around shadow-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.35rem)', paddingTop: '0.4rem' }}
      >
        <Link
          href="/"
          className={`flex flex-col items-center py-1 px-2.5 text-[10px] font-medium transition ${
            pathname === '/' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>{t('nav.dashboard')}</span>
        </Link>

        <Link
          href="/expenses"
          className={`flex flex-col items-center py-1 px-2.5 text-[10px] font-medium transition ${
            pathname === '/expenses' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <ArrowDownLeft className="w-5 h-5 mb-0.5" />
          <span>{t('nav.expenses')}</span>
        </Link>

        {/* Center Floating Quick Add Button */}
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            }
            setIsQuickAddOpen(true);
          }}
          className="-mt-5 w-12 h-12 rounded-full bg-indigo-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 hover:bg-indigo-700 transition"
          aria-label={t('nav.quickAdd')}
        >
          <Plus className="w-6 h-6" />
        </button>

        <Link
          href="/debts"
          className={`flex flex-col items-center py-1 px-2.5 text-[10px] font-medium transition ${
            pathname === '/debts' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <HandCoins className="w-5 h-5 mb-0.5" />
          <span>{t('nav.debts')}</span>
        </Link>

        <Link
          href="/settings"
          className={`flex flex-col items-center py-1 px-2.5 text-[10px] font-medium transition ${
            pathname === '/settings' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>{t('nav.settings')}</span>
        </Link>
      </nav>

      {/* QUICK ADD MODAL */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={() => {
          if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
          window.location.reload();
        }}
      />
    </div>
  );
}
