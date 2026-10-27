'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  X, Sparkles, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownLeft,
  Calendar, Tag, CreditCard, FileText, UserCheck
} from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialType?: 'expense' | 'income';
}

interface CategoryOption {
  id: string;
  name_en: string;
  name_uz: string;
  name_ru: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
}

export default function QuickAddModal({ isOpen, onClose, onSuccess, initialType = 'expense' }: QuickAddModalProps) {
  const { t, language, formatMoney, user } = useLanguage();

  const [activeTab, setActiveTab] = useState<'structured' | 'smart'>('smart');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Structured form state
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // Smart NLP state
  const [smartInput, setSmartInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [preview, setPreview] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setDate(new Date().toISOString().substring(0, 10));
      setErrorMsg('');
      setPreview(null);
      setSmartInput('');
      setType(initialType);
    }
  }, [isOpen, initialType]);

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

  const handleAnalyze = async () => {
    if (!smartInput.trim()) return;
    setAnalyzing(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/nlp/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: smartInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.parsed) {
        setPreview(data.parsed);
      } else {
        setErrorMsg(data.error || 'Failed to analyze text');
      }
    } catch {
      setErrorMsg('Network error while analyzing');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCommitSmart = async () => {
    if (!preview || preview.isAmbiguous || !preview.amount) {
      setErrorMsg(preview?.clarificationMessage || t('transactions.clarificationMsg'));
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (preview.type === 'loan_given' || preview.type === 'borrowing') {
        // Record debt
        const res = await fetch('/api/debts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: preview.type === 'loan_given' ? 'lent' : 'borrowed',
            counterpartyName: preview.counterparty || 'Counterparty',
            originalAmount: preview.amount,
            lentDate: preview.date,
            dueDate: preview.dueDate || preview.date,
            notes: preview.description,
          }),
        });
        if (!res.ok) throw new Error('Failed to record loan');
      } else {
        // Record expense or income
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: preview.type === 'income' ? 'income' : 'expense',
            amount: preview.amount,
            categoryId: preview.categoryId,
            description: preview.description || 'Transaction',
            date: preview.date,
            paymentMethod: 'cash',
            notes: smartInput,
          }),
        });
        if (!res.ok) throw new Error('Failed to save transaction');
      }

      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setErrorMsg((e as any)?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStructured = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg(t('validation.positiveNumber'));
      return;
    }
    if (!description.trim()) {
      setErrorMsg(t('validation.required'));
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          categoryId: categoryId || null,
          description: description.trim(),
          date,
          paymentMethod,
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save transaction');
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setErrorMsg((err as any)?.message || 'Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              ⚡
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('nav.quickAdd')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1.5 mx-6 mt-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('smart')}
            className={`flex items-center justify-center space-x-2 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'smart'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>{t('transactions.smartTab')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('structured')}
            className={`flex items-center justify-center space-x-2 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'structured'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t('transactions.formTab')}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-start space-x-2 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-6">
          {/* SMART UNIVERSAL INPUT TAB */}
          {activeTab === 'smart' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {t('transactions.smartTab')}
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={smartInput}
                    onChange={(e) => setSmartInput(e.target.value)}
                    placeholder={t('transactions.smartPlaceholder')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t('transactions.smartHelper')}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !smartInput.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center space-x-2 transition disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>{analyzing ? t('common.loading') : t('transactions.parseButton')}</span>
                </button>
              </div>

              {/* CONFIRMATION PREVIEW CARD */}
              {preview && (
                <div className="mt-4 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      {t('transactions.previewTitle')}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-medium">
                      {preview.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {preview.isAmbiguous ? (
                    <div className="flex items-start space-x-2 text-amber-700 dark:text-amber-400 text-sm">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">{t('transactions.clarificationNeeded')}</div>
                        <div className="text-xs mt-0.5">{preview.clarificationMessage || t('transactions.clarificationMsg')}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{t('common.amount')}</span>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                          {formatMoney(preview.amount)}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{t('common.date')}</span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {preview.date}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{t('common.description')}</span>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {preview.description}
                        </div>
                      </div>

                      {preview.counterparty && (
                        <div className="col-span-2 flex items-center space-x-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          <UserCheck className="w-4 h-4" />
                          <span>Person: {preview.counterparty}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCommitSmart}
                      disabled={loading || preview.isAmbiguous}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{loading ? t('common.loading') : t('common.confirm')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STRUCTURED FORM TAB */}
          {activeTab === 'structured' && (
            <form onSubmit={handleSaveStructured} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl font-semibold text-sm transition ${
                    type === 'expense'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{t('nav.expenses')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl font-semibold text-sm transition ${
                    type === 'income'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{t('nav.income')}</span>
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.amount')} *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-4 pr-16 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">
                    {user?.currency || 'UZS'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.description')} *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Lunch, Grocery, Client invoice"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.category')}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('categories.uncategorized')}</option>
                  {filteredCategories.map((cat) => {
                    const name = language === 'uz' ? cat.name_uz : language === 'ru' ? cat.name_ru : cat.name_en;
                    return (
                      <option key={cat.id} value={cat.id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('common.date')}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('common.paymentMethod')}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cash">{t('common.cash')}</option>
                    <option value="card">{t('common.card')}</option>
                    <option value="bankTransfer">{t('common.bankTransfer')}</option>
                    <option value="other">{t('common.other')}</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.notes')} ({t('common.optional')})
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional details..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
                >
                  {loading ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
