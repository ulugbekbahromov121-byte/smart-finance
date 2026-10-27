'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowDownLeft, Plus, Search, Filter, Trash2, Calendar,
  CreditCard, Tag, AlertCircle, FileText
} from 'lucide-react';
import QuickAddModal from '@/components/transactions/QuickAddModal';

export default function ExpensesPage() {
  const { t, formatMoney, formatDt, language } = useLanguage();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [expenses, setExpenses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [period, setPeriod] = useState('month');
  const [categoryId, setCategoryId] = useState('all');
  const [search, setSearch] = useState('');
  const [totalSpent, setTotalSpent] = useState(0);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/transactions', window.location.origin);
      url.searchParams.set('type', 'expense');
      url.searchParams.set('period', period);
      if (categoryId !== 'all') url.searchParams.set('categoryId', categoryId);
      if (search.trim()) url.searchParams.set('search', search.trim());

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.transactions || []);
        const total = (data.transactions || []).reduce((acc: number, item: { amount: number }) => acc + Number(item.amount), 0);
        setTotalSpent(total);
      }
    } catch (e) {
      console.error('Failed to fetch expenses:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories((data.categories || []).filter((c: { type: string }) => c.type === 'expense'));
      }
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [period, categoryId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.deleteConfirmTitle') + ' ' + t('common.deleteConfirmDesc'))) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExpenses();
      }
    } catch (e) {
      console.error('Failed to delete expense:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('transactions.expensesTitle')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('transactions.filterByPeriod')}: {formatMoney(totalSpent)}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md shadow-rose-600/20 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('transactions.recordExpense')}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Period Buttons */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {['today', 'yesterday', 'week', 'month', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                period === p
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t(`transactions.${p}`)}
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center space-x-2">
          {/* Category Dropdown */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">{t('common.all')} {t('common.category')}</option>
            {categories.map((c) => {
              const name = language === 'uz' ? c.name_uz : language === 'ru' ? c.name_ru : c.name_en;
              return (
                <option key={c.id} value={c.id}>
                  {name}
                </option>
              );
            })}
          </select>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 w-36 sm:w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </form>
        </div>
      </div>

      {/* Expenses Table / Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {t('common.loading')}
          </div>
        ) : expenses.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.map((tx) => {
              const catName = language === 'uz' ? (tx.name_uz || tx.name_en) : language === 'ru' ? (tx.name_ru || tx.name_en) : tx.name_en;

              return (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: (tx.category_color || '#EF4444') + '18',
                        color: tx.category_color || '#EF4444',
                      }}
                    >
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {tx.description}
                      </p>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{catName || t('categories.uncategorized')}</span>
                        <span>•</span>
                        <span>{formatDt(tx.date)}</span>
                        {tx.payment_method && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{tx.payment_method}</span>
                          </>
                        )}
                      </div>
                      {tx.notes && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5 truncate">
                          "{tx.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 ml-4">
                    <span className="text-base font-black text-rose-600 dark:text-rose-400">
                      -{formatMoney(tx.amount)}
                    </span>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      title={t('common.delete')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">
            {t('common.emptyState')}
          </div>
        )}
      </div>

      <QuickAddModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialType="expense"
        onSuccess={fetchExpenses}
      />
    </div>
  );
}
