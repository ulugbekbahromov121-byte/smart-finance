'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  BarChart3, Download, Printer, TrendingUp, TrendingDown,
  ArrowDownLeft, ArrowUpRight, HandCoins, Calendar, PieChart
} from 'lucide-react';

export default function ReportsPage() {
  const { t, formatMoney, formatDt, language } = useLanguage();

  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/reports', window.location.origin);
      url.searchParams.set('period', period);
      if (period === 'custom' && startDate && endDate) {
        url.searchParams.set('startDate', startDate);
        url.searchParams.set('endDate', endDate);
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  const handleExportCsv = () => {
    window.open('/api/auth/export?format=csv', '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const categoryBreakdown = report?.categoryBreakdown || [];
  const largestExpenses = report?.largestExpenses || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('reports.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('reports.subtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>{t('reports.exportCsv')}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>{t('reports.printReport')}</span>
          </button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
          {['today', 'yesterday', 'week', 'month', 'year', 'custom'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                period === p
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t(`transactions.${p}`)}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center space-x-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
            <button
              onClick={fetchReports}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
            >
              {t('common.filter')}
            </button>
          </div>
        )}
      </div>

      {/* KEY METRICS SUMMARY */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs">{t('common.loading')}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Income */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">{t('reports.totalIncome')}</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatMoney(report?.totalIncome)}
              </div>
              <div className="mt-2 text-[11px] flex items-center space-x-1">
                {report?.incomeChangePct >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span className={report?.incomeChangePct >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {report?.incomeChangePct >= 0 ? '+' : ''}{report?.incomeChangePct}%
                </span>
                <span className="text-slate-400">vs prev</span>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">{t('reports.totalExpenses')}</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {formatMoney(report?.totalExpenses)}
              </div>
              <div className="mt-2 text-[11px] flex items-center space-x-1">
                {report?.expensesChangePct > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span className={report?.expensesChangePct > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                  {report?.expensesChangePct >= 0 ? '+' : ''}{report?.expensesChangePct}%
                </span>
                <span className="text-slate-400">vs prev</span>
              </div>
            </div>

            {/* Net Cash Flow */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">{t('reports.netCashFlow')}</span>
              <div className={`text-2xl font-black mt-1 ${
                report?.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {report?.netCashFlow >= 0 ? '+' : ''}{formatMoney(report?.netCashFlow)}
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                Cash inflow minus cash outflow
              </span>
            </div>

            {/* Average Daily Spending */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">{t('reports.averageDaily')}</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {formatMoney(report?.averageDailySpending)}
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">
                Per day in this period
              </span>
            </div>
          </div>

          {/* RECEIVABLES & LIABILITIES OVERVIEW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium block">{t('reports.receivablesOutstanding')}</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                  {formatMoney(report?.totalReceivables)}
                </span>
              </div>
              <HandCoins className="w-8 h-8 text-blue-500/30" />
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium block">{t('reports.liabilitiesOutstanding')}</span>
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                  {formatMoney(report?.totalLiabilities)}
                </span>
              </div>
              <HandCoins className="w-8 h-8 text-amber-500/30 rotate-180" />
            </div>
          </div>

          {/* CATEGORY BREAKDOWN & LARGEST EXPENSES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                {t('reports.categoryBreakdown')}
              </h3>

              {categoryBreakdown.length > 0 ? (
                <div className="space-y-3.5">
                  {categoryBreakdown.map((cat: any) => {
                    const name = language === 'uz' ? (cat.name_uz || cat.name_en) : language === 'ru' ? (cat.name_ru || cat.name_en) : cat.name_en;
                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300 truncate mr-2">
                            {name}
                          </span>
                          <span className="text-slate-900 dark:text-white shrink-0">
                            {formatMoney(cat.total)} ({cat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: cat.color || '#6366F1',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  {t('reports.noData')}
                </div>
              )}
            </div>

            {/* Largest Expenses in Period */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                {t('reports.largestExpense')}
              </h3>

              {largestExpenses.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {largestExpenses.map((tx: any, idx: number) => {
                    const catName = language === 'uz' ? (tx.name_uz || tx.name_en) : language === 'ru' ? (tx.name_ru || tx.name_en) : tx.name_en;
                    return (
                      <div key={tx.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {tx.description}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {catName} • {formatDt(tx.date)}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                          -{formatMoney(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  {t('reports.noData')}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
