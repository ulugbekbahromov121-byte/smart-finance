'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, TrendingUp, HandCoins,
  AlertTriangle, CheckCircle2, Clock, Calendar, ChevronRight,
  PlusCircle, RefreshCw, Info, PieChart
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { t, formatMoney, formatDt, user, refreshNotifications, refreshUser, language } = useLanguage();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      let res = await fetch('/api/dashboard');
      if (res.status === 401) {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
          try {
            const authRes = await fetch('/api/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: window.Telegram.WebApp.initData }),
            });
            if (authRes.ok) {
              await refreshUser();
              res = await fetch('/api/dashboard');
            }
          } catch {
            // fallback
          }
        }
      }

      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Run background notification checks for budget warnings and debt reminders
    fetch('/api/notifications/check', { method: 'POST' })
      .then(() => refreshNotifications())
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const budgets = data?.budgets || [];
  const recentTransactions = data?.recentTransactions || [];
  const upcomingDebts = data?.upcomingDebts || [];
  const last7Days = data?.last7Days || [];
  const categoryShare = data?.categoryShare || [];

  // Find daily budget if any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dailyBudget = budgets.find((b: any) => b.period === 'daily') || budgets[0];

  // Max for daily expenses chart scaling
  const maxDayAmount = Math.max(...last7Days.map((d: { amount: number }) => d.amount), 1000);

  return (
    <div className="space-y-6">
      {/* Top Welcome / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('dashboard.subtitle')}
          </p>
        </div>
      </div>

      {/* METRIC CARDS ROW 1: Available Balance & Today's Cash Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/20 relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-xs font-semibold text-indigo-100 uppercase tracking-wider block">
              {t('dashboard.availableBalance')}
            </span>
            <div className="text-2xl font-black mt-1">
              {formatMoney(summary.availableBalance)}
            </div>
            <div className="mt-2 text-[10px] text-indigo-200/90 flex items-center space-x-1">
              <Info className="w-3 h-3 flex-shrink-0" />
              <span className="line-clamp-1">{t('dashboard.openingBalanceNote')}</span>
            </div>
          </div>
          <Wallet className="w-24 h-24 absolute -right-4 -bottom-4 text-white/10" />
        </div>

        {/* Today's Expenses */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('dashboard.todayExpenses')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {formatMoney(summary.todayExpenses)}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {t('dashboard.monthExpenses')}: <span className="font-semibold text-slate-600 dark:text-slate-300">{formatMoney(summary.monthExpenses)}</span>
          </span>
        </div>

        {/* Today's Income */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('dashboard.todayIncome')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {formatMoney(summary.todayIncome)}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {t('dashboard.monthIncome')}: <span className="font-semibold text-slate-600 dark:text-slate-300">{formatMoney(summary.monthIncome)}</span>
          </span>
        </div>

        {/* Today's Net Cash Flow */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('dashboard.todayNet')}
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              summary.todayNet >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-black mt-2 ${
            summary.todayNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {summary.todayNet >= 0 ? '+' : ''}{formatMoney(summary.todayNet)}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Month Net: <span className="font-semibold text-slate-600 dark:text-slate-300">{formatMoney(summary.monthNet)}</span>
          </span>
        </div>
      </div>

      {/* METRIC CARDS ROW 2: Outstanding Receivables & Liabilities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Money Lent to Others (Receivables) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                {t('dashboard.loansGiven')}
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {formatMoney(summary.totalReceivables)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <HandCoins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500">{t('debts.debtsDueToday')}: <strong className="text-slate-900 dark:text-white">{summary.debtsDueTodayCount}</strong></span>
            <Link href="/debts?type=lent" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('dashboard.viewAll')} &rarr;
            </Link>
          </div>
        </div>

        {/* Money Borrowed (Liabilities) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                {t('dashboard.debtsOwed')}
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {formatMoney(summary.totalLiabilities)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HandCoins className="w-5 h-5 rotate-180" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500">{t('debts.overdueDebts')}: <strong className="text-rose-600">{summary.overdueDebtsCount}</strong></span>
            <Link href="/debts?type=borrowed" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('dashboard.viewAll')} &rarr;
            </Link>
          </div>
        </div>

        {/* Primary Budget Progress */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {dailyBudget ? `${dailyBudget.period.toUpperCase()} ${t('nav.budgets')}` : t('dashboard.todayBudget')}
            </span>
            {dailyBudget && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                dailyBudget.status === 'normal'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : dailyBudget.status === 'warning'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
              }`}>
                {t(`budgets.status.${dailyBudget.status}`)}
              </span>
            )}
          </div>

          {dailyBudget ? (
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatMoney(dailyBudget.spent)}
                </span>
                <span className="text-xs text-slate-400">
                  / {formatMoney(dailyBudget.amount)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    dailyBudget.percentage >= 100
                      ? 'bg-rose-500'
                      : dailyBudget.percentage >= 90
                      ? 'bg-rose-400'
                      : dailyBudget.percentage >= 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, dailyBudget.percentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span>{dailyBudget.percentage}% {t('dashboard.budgetUsed')}</span>
                <span>{t('budgets.remaining')}: <strong>{formatMoney(dailyBudget.remaining)}</strong></span>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-center py-2">
              <p className="text-xs text-slate-400 mb-2">{t('budgets.noBudgets')}</p>
              <Link href="/budgets" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                + {t('budgets.createBudget')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Expenses Last 7 Days (Interactive SVG Bar Chart) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('dashboard.dailyTrend')}
            </h2>
            <span className="text-xs text-slate-400 font-medium">7 days</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-6">
            {last7Days.map((day: { date: string; label: string; amount: number }, index: number) => {
              const heightPct = Math.round((day.amount / maxDayAmount) * 100);
              return (
                <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    {formatMoney(day.amount)}
                  </span>
                  <div className="w-full max-w-[36px] bg-indigo-50 dark:bg-indigo-950/40 rounded-t-lg relative flex items-end h-full">
                    <div
                      className="w-full bg-indigo-600 group-hover:bg-indigo-500 rounded-t-lg transition-all duration-300"
                      style={{ height: `${Math.max(6, heightPct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-medium">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses by Category Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('dashboard.categoryShare')}
            </h2>
            <Link href="/reports" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>

          {categoryShare.length > 0 ? (
            <div className="space-y-3">
              {categoryShare.map((cat: any, i: number) => {
                const name = language === 'uz' ? (cat.name_uz || cat.name_en) : language === 'ru' ? (cat.name_ru || cat.name_en) : cat.name_en;
                const totalMonth = summary.monthExpenses || 1;
                const pct = Math.round((Number(cat.total) / totalMonth) * 100);

                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate mr-2">
                        {name || 'Uncategorized'}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white shrink-0">
                        {formatMoney(cat.total)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cat.category_color || '#6366F1',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center">
              <PieChart className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs text-slate-400">{t('common.emptyState')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: Upcoming Debt Deadlines & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Debt Repayment Deadlines */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>{t('dashboard.upcomingDebts')}</span>
            </h2>
            <Link href="/debts" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>

          {upcomingDebts.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingDebts.map((d: any) => {
                const outstanding = Math.max(0, Number(d.original_amount) - Number(d.amount_repaid));
                const isLent = d.type === 'lent';
                return (
                  <div key={d.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isLent ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          {isLent ? 'Lent' : 'Borrowed'}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {d.counterparty_name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Due: {formatDt(d.due_date)}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {formatMoney(outstanding)}
                      </div>
                      <span className={`text-[10px] font-semibold ${
                        d.status === 'overdue' ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                        {t(`debts.status.${d.status}`)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              {t('dashboard.noUpcomingDebts')}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('dashboard.recentTransactions')}
            </h2>
            <Link href="/expenses" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.map((tx: any) => {
                const isExpense = tx.type === 'expense' || tx.type === 'loan_given' || tx.type === 'debt_repayment_made';
                const catName = language === 'uz' ? (tx.name_uz || tx.name_en) : language === 'ru' ? (tx.name_ru || tx.name_en) : tx.name_en;

                return (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isExpense ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                      }`}>
                        {isExpense ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {tx.description}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {catName || tx.type} • {formatDt(tx.date)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-extrabold ${
                        isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isExpense ? '-' : '+'}{formatMoney(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              {t('common.emptyState')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
