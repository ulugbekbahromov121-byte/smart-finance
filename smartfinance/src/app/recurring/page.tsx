'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  RefreshCw, Plus, Trash2, CheckCircle2, Play, Calendar,
  ArrowDownLeft, ArrowUpRight, X, Clock
} from 'lucide-react';

export default function RecurringPage() {
  const { t, formatMoney, formatDt, language } = useLanguage();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recurringList, setRecurringList] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Form state
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().substring(0, 10));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchRecurring = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recurring');
      if (res.ok) {
        const data = await res.json();
        setRecurringList(data.recurring || []);
      }
    } catch (e) {
      console.error('Failed to fetch recurring:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchRecurring();
    fetchCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      setErrorMsg(t('validation.required'));
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          categoryId: categoryId || null,
          description: description.trim(),
          frequency,
          nextDueDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create recurring schedule');
      }

      setIsModalOpen(false);
      setDescription('');
      setAmount('');
      fetchRecurring();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setErrorMsg((err as any)?.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, current: number) => {
    try {
      await fetch('/api/recurring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: current ? 0 : 1 }),
      });
      fetchRecurring();
    } catch (e) {
      console.error('Failed to toggle status:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.deleteConfirmTitle'))) return;
    try {
      await fetch(`/api/recurring?id=${id}`, { method: 'DELETE' });
      fetchRecurring();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const handleProcessDueNow = async () => {
    setProcessing(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/recurring/process', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg(data.message || t('recurring.processSuccess'));
        fetchRecurring();
      }
    } catch {
      setStatusMsg('Failed to process recurring transactions');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('recurring.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('recurring.subtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleProcessDueNow}
            disabled={processing}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-indigo-500" />
            <span>{processing ? t('common.loading') : t('recurring.processNow')}</span>
          </button>

          <button
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t('recurring.newRecurring')}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Recurring Schedule List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">{t('common.loading')}</div>
        ) : recurringList.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recurringList.map((item) => {
              const isExpense = item.type === 'expense';
              const catName = language === 'uz' ? (item.name_uz || item.name_en) : language === 'ru' ? (item.name_ru || item.name_en) : item.name_en;

              return (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isExpense ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                    }`}>
                      <RefreshCw className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isExpense ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.description}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                          {t(`recurring.${item.frequency}`)}
                        </span>
                        <span>•</span>
                        <span>{catName || 'General'}</span>
                        <span>•</span>
                        <span>{t('recurring.nextDue')}: <strong>{formatDt(item.next_due_date)}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0 ml-4">
                    <span className={`text-base font-black ${
                      isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isExpense ? '-' : '+'}{formatMoney(item.amount)}
                    </span>

                    {/* Active toggle button */}
                    <button
                      onClick={() => handleToggleActive(item.id, item.is_active)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                        item.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.is_active ? t('recurring.active') : 'Paused'}
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      title={t('common.delete')}
                      className="text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="font-semibold mb-1">{t('recurring.noRecurring')}</p>
            <p className="text-[11px] text-slate-400">Automate your monthly salary, rent, internet or subscriptions.</p>
          </div>
        )}
      </div>

      {/* CREATE RECURRING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('recurring.newRecurring')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 rounded-xl text-xs font-semibold transition ${
                    type === 'expense'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t('nav.expenses')}
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 rounded-xl text-xs font-semibold transition ${
                    type === 'income'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t('nav.income')}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.description')} *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly Rent or Salary"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.amount')} *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('recurring.frequency')}
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="daily">{t('recurring.daily')}</option>
                    <option value="weekly">{t('recurring.weekly')}</option>
                    <option value="monthly">{t('recurring.monthly')}</option>
                    <option value="yearly">{t('recurring.yearly')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('recurring.nextDue')}
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
                >
                  {saving ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
