'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  Bell, CheckCheck, Trash2, Sliders, AlertTriangle, AlertCircle,
  Clock, CheckCircle, Info, X
} from 'lucide-react';

export default function NotificationsPage() {
  const { t, formatDt, language, refreshNotifications } = useLanguage();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrefOpen, setIsPrefOpen] = useState(false);

  // Notification Preferences
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prefs, setPrefs] = useState<any>({
    budget_warning: 1,
    budget_exceeded: 1,
    debt_due_reminders: 1,
    overdue_reminders: 1,
    reminder_days_before: 1,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/notifications/preferences');
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) setPrefs(data.preferences);
      }
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      fetchNotifications();
      refreshNotifications();
    } catch (e) {
      console.error('Failed to mark all read:', e);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(t('common.deleteConfirmTitle'))) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_all' }),
      });
      fetchNotifications();
      refreshNotifications();
    } catch (e) {
      console.error('Failed to clear notifications:', e);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetWarning: prefs.budget_warning,
          budgetExceeded: prefs.budget_exceeded,
          debtDueReminders: prefs.debt_due_reminders,
          overdueReminders: prefs.overdue_reminders,
          reminderDaysBefore: prefs.reminder_days_before,
        }),
      });
      setIsPrefOpen(false);
    } catch (e) {
      console.error('Failed to update preferences:', e);
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('notifications.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('notifications.subtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPrefOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t('notifications.preferences')}</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            disabled={notifications.length === 0}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition shadow-xs disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t('notifications.markAllRead')}</span>
          </button>

          <button
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 transition shadow-xs disabled:opacity-50"
            title={t('notifications.clearAll')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">{t('common.loading')}</div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => {
              const title = language === 'uz' ? n.title_uz : language === 'ru' ? n.title_ru : n.title_en;
              const msg = language === 'uz' ? n.message_uz : language === 'ru' ? n.message_ru : n.message_en;

              const isBudgetExceeded = n.type === 'budget_exceeded';
              const isBudgetWarning = n.type === 'budget_warning';
              const isOverdue = n.type === 'debt_overdue';

              return (
                <div
                  key={n.id}
                  className={`p-4 flex items-start space-x-3.5 transition ${
                    !n.is_read ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isBudgetExceeded || isOverdue
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                        : isBudgetWarning
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600'
                    }`}
                  >
                    {isBudgetExceeded || isOverdue ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : isBudgetWarning ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mr-2">
                        {title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatDt(n.created_at, true)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {msg}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-slate-400 text-xs">
            <Bell className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="font-semibold">{t('notifications.noNotifications')}</p>
          </div>
        )}
      </div>

      {/* NOTIFICATION PREFERENCES MODAL */}
      {isPrefOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('notifications.preferences')}
              </h3>
              <button
                onClick={() => setIsPrefOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="p-6 space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('notifications.prefBudgetWarning')}
                </span>
                <input
                  type="checkbox"
                  checked={!!prefs.budget_warning}
                  onChange={(e) => setPrefs({ ...prefs, budget_warning: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('notifications.prefBudgetExceeded')}
                </span>
                <input
                  type="checkbox"
                  checked={!!prefs.budget_exceeded}
                  onChange={(e) => setPrefs({ ...prefs, budget_exceeded: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('notifications.prefDebtDue')}
                </span>
                <input
                  type="checkbox"
                  checked={!!prefs.debt_due_reminders}
                  onChange={(e) => setPrefs({ ...prefs, debt_due_reminders: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('notifications.prefDebtOverdue')}
                </span>
                <input
                  type="checkbox"
                  checked={!!prefs.overdue_reminders}
                  onChange={(e) => setPrefs({ ...prefs, overdue_reminders: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPrefOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingPrefs}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
                >
                  {savingPrefs ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
