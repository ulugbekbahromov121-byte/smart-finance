'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SupportedLanguage, SupportedCurrency, getTranslation, formatCurrency, formatDate } from '@/lib/i18n';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  language: SupportedLanguage;
  currency: string;
  timezone: string;
  openingBalance: number;
}

interface LanguageContextType {
  language: SupportedLanguage;
  currency: string;
  user: UserProfile | null;
  unreadCount: number;
  theme: 'light' | 'dark';
  isTelegram: boolean;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  setCurrency: (curr: string) => Promise<void>;
  toggleTheme: () => void;
  refreshUser: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  formatMoney: (amount: number | null | undefined) => string;
  formatDt: (date: string | Date, includeTime?: boolean) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('uz');
  const [currency, setCurrencyState] = useState<string>('UZS');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isTelegram, setIsTelegram] = useState<boolean>(false);

  // Load initial theme and language from localStorage on client
  useEffect(() => {
    const savedLang = localStorage.getItem('sf_lang') as SupportedLanguage;
    if (savedLang && ['en', 'uz', 'ru'].includes(savedLang)) {
      setLanguageState(savedLang);
    }
    const savedTheme = localStorage.getItem('sf_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setLanguageState(data.user.language || 'uz');
          setCurrencyState(data.user.currency || 'UZS');
          setUnreadCount(data.unreadNotifications || 0);
          localStorage.setItem('sf_lang', data.user.language || 'uz');
          return data.user;
        }
      }
      setUser(null);
      return null;
    } catch (e) {
      console.warn('Failed to refresh user:', e);
      return null;
    }
  }, []);

  const refreshNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // non-blocking
    }
  };

  // Telegram WebApp Initialization and Auto-Login
  useEffect(() => {
    let isMounted = true;

    async function initTelegram() {
      if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
        await refreshUser();
        return;
      }

      const tg = window.Telegram.WebApp;
      setIsTelegram(true);

      try {
        tg.ready();
        tg.expand();

        // Match Telegram color scheme
        if (tg.colorScheme === 'dark') {
          setTheme('dark');
          document.documentElement.classList.add('dark');
          localStorage.setItem('sf_theme', 'dark');
        } else if (tg.colorScheme === 'light') {
          setTheme('light');
          document.documentElement.classList.remove('dark');
          localStorage.setItem('sf_theme', 'light');
        }

        const isDark = tg.colorScheme === 'dark';
        if (typeof tg.setHeaderColor === 'function') {
          tg.setHeaderColor(isDark ? '#0f172a' : '#ffffff');
        }
        if (typeof tg.setBackgroundColor === 'function') {
          tg.setBackgroundColor(isDark ? '#020617' : '#f8fafc');
        }
      } catch (err) {
        console.warn('Telegram WebApp setup error:', err);
      }

      // Check current session first
      const currentUser = await refreshUser();
      if (currentUser || !isMounted) return;

      // If no session but Telegram initData is available, auto-login
      if (tg.initData) {
        try {
          const res = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData }),
          });

          if (res.ok && isMounted) {
            const data = await res.json();
            if (data.success && data.user) {
              setUser(data.user);
              setLanguageState(data.user.language || 'uz');
              setCurrencyState(data.user.currency || 'UZS');
              localStorage.setItem('sf_lang', data.user.language || 'uz');
              if (data.token) {
                localStorage.setItem('sf_auth_token', data.token);
              }
            }
          }
        } catch (err) {
          console.warn('Telegram auto-authentication failed:', err);
        }
      }
    }

    initTelegram();

    return () => {
      isMounted = false;
    };
  }, [refreshUser]);

  const setLanguage = async (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    localStorage.setItem('sf_lang', newLang);

    if (user) {
      setUser({ ...user, language: newLang });
      try {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: newLang }),
        });
      } catch (e) {
        console.error('Failed to sync language to profile:', e);
      }
    }
  };

  const setCurrency = async (newCurr: string) => {
    setCurrencyState(newCurr);
    if (user) {
      setUser({ ...user, currency: newCurr });
      try {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency: newCurr }),
        });
      } catch (e) {
        console.error('Failed to sync currency:', e);
      }
    }
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('sf_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Sync header color with Telegram
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.setHeaderColor(next === 'dark' ? '#0f172a' : '#ffffff');
        window.Telegram.WebApp.setBackgroundColor(next === 'dark' ? '#020617' : '#f8fafc');
      } catch {}
    }
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    return getTranslation(language, path, params);
  };

  const formatMoney = (amount: number | null | undefined): string => {
    return formatCurrency(amount, currency, language);
  };

  const formatDt = (date: string | Date, includeTime = false): string => {
    return formatDate(date, language, includeTime);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        currency,
        user,
        unreadCount,
        theme,
        isTelegram,
        setLanguage,
        setCurrency,
        toggleTheme,
        refreshUser,
        refreshNotifications,
        t,
        formatMoney,
        formatDt,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
