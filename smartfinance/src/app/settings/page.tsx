'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES, SupportedLanguage } from '@/lib/i18n';
import {
  Settings, Globe, Coins, Clock, Shield, Download,
  Trash2, AlertTriangle, CheckCircle, Lock, User
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { t, language, setLanguage, currency, setCurrency, user, refreshUser } = useLanguage();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [selectedCurrency, setSelectedCurrency] = useState(currency || 'UZS');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Tashkent');
  const [openingBalance, setOpeningBalance] = useState(String(user?.openingBalance || 0));

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Delete account state
  const [deletePass, setDeletePass] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setSelectedCurrency(user.currency || 'UZS');
      setTimezone(user.timezone || 'Asia/Tashkent');
      setOpeningBalance(String(user.openingBalance || 0));
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          currency: selectedCurrency,
          timezone,
          openingBalance: parseFloat(openingBalance) || 0,
        }),
      });

      if (res.ok) {
        await setCurrency(selectedCurrency);
        await refreshUser();
        setProfileMsg(t('settings.saved'));
        setTimeout(() => setProfileMsg(''), 3000);
      }
    } catch {
      setProfileMsg('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');

    if (newPassword !== confirmPassword) {
      setPasswordMsg(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg(t('validation.passwordMinLength'));
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password update failed');
      }

      setPasswordMsg(t('auth.passwordResetSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 4000);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPasswordMsg((err as any)?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePass) {
      setDeleteError(t('validation.required'));
      return;
    }

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePass }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Deletion failed');
      }

      await refreshUser();
      router.push('/login');
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDeleteError((err as any)?.message || 'Failed to delete account');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* SECTION 1: Profile & Regional Preferences */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
          <User className="w-4 h-4 text-indigo-500" />
          <span>{t('settings.profile')}</span>
        </h2>

        {profileMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{profileMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.fullName')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.language')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLanguage(l.code)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1.5 transition ${
                      language === l.code
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span className="truncate">{l.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Currency Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.currency')}
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400 leading-normal">
                {t('settings.currencyNotice')}
              </p>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.timezone')}
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Asia/Tashkent">Asia/Tashkent (UTC+5)</option>
                <option value="Asia/Samarkand">Asia/Samarkand (UTC+5)</option>
                <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
                <option value="Europe/London">Europe/London (UTC+0)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
              </select>
            </div>

            {/* Opening Balance */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.openingBalance')} ({selectedCurrency})
              </label>
              <input
                type="number"
                step="any"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                {t('settings.balanceNotice')}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
            >
              {savingProfile ? t('common.loading') : t('settings.saveChanges')}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Security & Password */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>{t('settings.security')}</span>
        </h2>

        {passwordMsg && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            {passwordMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('settings.currentPassword')}
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('settings.newPassword')}
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.confirmPassword')}
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="mt-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 font-semibold text-xs transition disabled:opacity-50"
          >
            {savingPassword ? t('common.loading') : t('settings.changePassword')}
          </button>
        </form>
      </div>

      {/* SECTION 3: Data Management */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center space-x-2">
          <Download className="w-4 h-4 text-indigo-500" />
          <span>{t('settings.dataManagement')}</span>
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Export your complete financial records, transactions, debts, and budgets anytime.
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href="/api/auth/export?format=json"
            download
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>{t('settings.exportData')}</span>
          </a>

          <a
            href="/api/auth/export?format=csv"
            download
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>{t('settings.exportCsvData')}</span>
          </a>
        </div>
      </div>

      {/* SECTION 4: Danger Zone */}
      <div className="p-6 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
        <h2 className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-1 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{t('settings.dangerZone')}</span>
        </h2>
        <p className="text-xs text-rose-600/80 dark:text-rose-300/70 mb-4 max-w-xl">
          {t('settings.deleteAccountWarning')}
        </p>

        <button
          onClick={() => {
            setDeleteError('');
            setDeletePass('');
            setIsDeleteModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition"
        >
          {t('settings.deleteAccount')}
        </button>
      </div>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('settings.deleteAccount')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('settings.deleteAccountWarning')} Please confirm your password to proceed:
            </p>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <input
              type="password"
              placeholder="Enter your password"
              value={deletePass}
              onChange={(e) => setDeletePass(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition"
              >
                {t('common.confirm')} {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
