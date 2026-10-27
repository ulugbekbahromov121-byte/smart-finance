'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  HandCoins, Plus, ArrowDownLeft, ArrowUpRight, Calendar,
  Clock, CheckCircle, AlertTriangle, Trash2, History, X, User
} from 'lucide-react';

export default function DebtsPage() {
  const { t, formatMoney, formatDt } = useLanguage();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [debts, setDebts] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filter
  const [activeTab, setActiveTab] = useState<'all' | 'lent' | 'borrowed'>('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedDebt, setSelectedDebt] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  // Create form state
  const [debtType, setDebtType] = useState<'lent' | 'borrowed'>('lent');
  const [counterparty, setCounterparty] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [lentDate, setLentDate] = useState(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Repayment form state
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().substring(0, 10));
  const [repayNotes, setRepayNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDebts = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/debts', window.location.origin);
      if (activeTab !== 'all') url.searchParams.set('type', activeTab);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setDebts(data.debts || []);
        setSummary(data.summary || {});
      }
    } catch (e) {
      console.error('Failed to fetch debts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, [activeTab]);

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterparty.trim() || !originalAmount || parseFloat(originalAmount) <= 0) {
      setErrorMsg(t('validation.required'));
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: debtType,
          counterpartyName: counterparty.trim(),
          originalAmount: parseFloat(originalAmount),
          lentDate,
          dueDate: dueDate || lentDate,
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record debt');
      }

      setIsCreateOpen(false);
      setCounterparty('');
      setOriginalAmount('');
      setNotes('');
      fetchDebts();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setErrorMsg((err as any)?.message || 'Failed to record debt');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || !repayAmount || parseFloat(repayAmount) <= 0) {
      setErrorMsg(t('validation.positiveNumber'));
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/debts/${selectedDebt.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(repayAmount),
          paymentDate: repayDate,
          notes: repayNotes.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record repayment');
      }

      setIsRepayOpen(false);
      setRepayAmount('');
      setRepayNotes('');
      setSelectedDebt(null);
      fetchDebts();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setErrorMsg((err as any)?.message || 'Failed to record repayment');
    } finally {
      setSaving(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openHistory = async (debt: any) => {
    setSelectedDebt(debt);
    try {
      const res = await fetch(`/api/debts/${debt.id}`);
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(data.payments || []);
        setIsHistoryOpen(true);
      }
    } catch {
      // non-blocking
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.deleteConfirmTitle') + ' ' + t('common.deleteConfirmDesc'))) return;
    try {
      const res = await fetch(`/api/debts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDebts();
      }
    } catch (e) {
      console.error('Failed to delete debt:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('debts.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('debts.subtitle')}
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setIsCreateOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('debts.recordLoan')} / {t('debts.recordBorrowing')}</span>
        </button>
      </div>

      {/* Accounting Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs text-indigo-900 dark:text-indigo-300 leading-relaxed flex items-start space-x-2.5">
        <HandCoins className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-600" />
        <span>{t('debts.accountingNotice')}</span>
      </div>

      {/* DEBT DASHBOARD SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">{t('debts.expectedReturn')}</span>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatMoney(summary.expectedToReturn)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {t('debts.totalLent')}: {formatMoney(summary.totalLent)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">{t('debts.toRepay')}</span>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {formatMoney(summary.stillToRepay)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {t('debts.totalBorrowed')}: {formatMoney(summary.totalBorrowed)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">{t('debts.debtsDueToday')}</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {summary.dueTodayCount || 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Needs immediate action</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">{t('debts.overdueDebts')}</span>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {summary.overdueCount || 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Overdue repayment date</span>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'all'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          {t('common.all')}
        </button>
        <button
          onClick={() => setActiveTab('lent')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'lent'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          {t('debts.moneyLent')}
        </button>
        <button
          onClick={() => setActiveTab('borrowed')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'borrowed'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          {t('debts.moneyBorrowed')}
        </button>
      </div>

      {/* Debts Cards List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">{t('common.loading')}</div>
      ) : debts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debts.map((d) => {
            const isLent = d.type === 'lent';
            const orig = Number(d.original_amount) || 0;
            const repaid = Number(d.amount_repaid) || 0;
            const outstanding = Math.max(0, orig - repaid);
            const progress = orig > 0 ? Math.round((repaid / orig) * 100) : 0;

            const statusClass =
              d.status === 'fully_repaid'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : d.status === 'overdue'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                : d.status === 'partially_repaid'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';

            return (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isLent ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {isLent ? t('debts.moneyLent') : t('debts.moneyBorrowed')}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusClass}`}>
                        {t(`debts.status.${d.status}`)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(d.id)}
                      title={t('common.delete')}
                      className="text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{d.counterparty_name}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isLent ? t('debts.counterpartyBorrower') : t('debts.counterpartyLender')}
                    </p>
                  </div>

                  {/* Balances */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">{t('debts.outstandingBalance')}</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {formatMoney(outstanding)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block">{t('debts.originalAmount')}</span>
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {formatMoney(orig)}
                      </span>
                    </div>
                  </div>

                  {/* Repayment Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        d.status === 'fully_repaid' ? 'bg-emerald-500' : isLent ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                    <span>{t('debts.amountRepaid')}: {formatMoney(repaid)} ({progress}%)</span>
                    <span>Due: <strong>{formatDt(d.due_date)}</strong></span>
                  </div>

                  {d.notes && (
                    <p className="text-xs text-slate-500 italic mt-2">
                      "{d.notes}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openHistory(d)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>{t('debts.repaymentHistory')}</span>
                  </button>

                  {d.status !== 'fully_repaid' && (
                    <button
                      onClick={() => {
                        setSelectedDebt(d);
                        setRepayAmount(String(outstanding));
                        setErrorMsg('');
                        setIsRepayOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition"
                    >
                      {t('debts.recordRepayment')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center shadow-xs">
          <HandCoins className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            {t('common.emptyState')}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Track money lent to friends or money borrowed from colleagues with full repayment history and automated reminders.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
          >
            + {t('debts.recordLoan')}
          </button>
        </div>
      )}

      {/* CREATE DEBT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {debtType === 'lent' ? t('debts.recordLoan') : t('debts.recordBorrowing')}
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
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

            <form onSubmit={handleCreateDebt} className="p-6 space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDebtType('lent')}
                  className={`py-2 rounded-xl text-xs font-semibold transition ${
                    debtType === 'lent'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t('debts.moneyLent')}
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType('borrowed')}
                  className={`py-2 rounded-xl text-xs font-semibold transition ${
                    debtType === 'borrowed'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t('debts.moneyBorrowed')}
                </button>
              </div>

              {/* Counterparty Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {debtType === 'lent' ? t('debts.counterpartyBorrower') : t('debts.counterpartyLender')} *
                </label>
                <input
                  type="text"
                  required
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder="e.g. Shohruh or Akmal"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Original Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('debts.originalAmount')} *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {debtType === 'lent' ? t('debts.lentDate') : t('debts.borrowedDate')}
                  </label>
                  <input
                    type="date"
                    value={lentDate}
                    onChange={(e) => setLentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('debts.dueDate')}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
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
                  placeholder="e.g. For car repair"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
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

      {/* RECORD REPAYMENT MODAL */}
      {isRepayOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('debts.recordRepayment')} — {selectedDebt.counterparty_name}
              </h3>
              <button
                onClick={() => setIsRepayOpen(false)}
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

            <form onSubmit={handleRecordRepayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('debts.repaymentAmount')} *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Remaining: {formatMoney(Math.max(0, Number(selectedDebt.original_amount) - Number(selectedDebt.amount_repaid)))}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('debts.repaymentDate')}
                </label>
                <input
                  type="date"
                  value={repayDate}
                  onChange={(e) => setRepayDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('common.notes')} ({t('common.optional')})
                </label>
                <input
                  type="text"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  placeholder="e.g. Card transfer"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRepayOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
                >
                  {saving ? t('common.loading') : t('common.confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPAYMENT HISTORY MODAL */}
      {isHistoryOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('debts.repaymentHistory')} — {selectedDebt.counterparty_name}
              </h3>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {paymentHistory.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                  {paymentHistory.map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatMoney(p.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {formatDt(p.payment_date)}
                        </span>
                        {p.notes && (
                          <span className="text-[10px] text-slate-500 italic block">
                            "{p.notes}"
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        Paid
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  {t('debts.noRepayments')}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
