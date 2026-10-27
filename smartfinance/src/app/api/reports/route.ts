import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { formatLocalDate } from '@/lib/accounting';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const period = searchParams.get('period') || 'month'; // today, yesterday, week, month, year, custom
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const db = getDb();
    const now = new Date();
    const todayStr = formatLocalDate(now, user.timezone);

    let currentStart = '';
    let currentEnd = '';
    let prevStart = '';
    let prevEnd = '';

    if (period === 'today') {
      currentStart = todayStr;
      currentEnd = todayStr;
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      prevStart = formatLocalDate(yest, user.timezone);
      prevEnd = prevStart;
    } else if (period === 'yesterday') {
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      currentStart = formatLocalDate(yest, user.timezone);
      currentEnd = currentStart;
      const dayBefore = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      prevStart = formatLocalDate(dayBefore, user.timezone);
      prevEnd = prevStart;
    } else if (period === 'week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      currentStart = formatLocalDate(monday, user.timezone);
      currentEnd = todayStr;

      const prevMon = new Date(monday.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prevSun = new Date(monday.getTime() - 1 * 24 * 60 * 60 * 1000);
      prevStart = formatLocalDate(prevMon, user.timezone);
      prevEnd = formatLocalDate(prevSun, user.timezone);
    } else if (period === 'year') {
      const year = todayStr.substring(0, 4);
      currentStart = `${year}-01-01`;
      currentEnd = `${year}-12-31`;
      const prevYear = Number(year) - 1;
      prevStart = `${prevYear}-01-01`;
      prevEnd = `${prevYear}-12-31`;
    } else if (period === 'custom' && startDateParam && endDateParam) {
      currentStart = startDateParam;
      currentEnd = endDateParam;
      prevStart = currentStart;
      prevEnd = currentEnd;
    } else {
      // Default: this month
      const currentMonth = todayStr.substring(0, 7);
      currentStart = `${currentMonth}-01`;
      currentEnd = todayStr;

      // Previous month
      const ym = currentMonth.split('-');
      const y = Number(ym[0]);
      const m = Number(ym[1]);
      const prevY = m === 1 ? y - 1 : y;
      const prevM = m === 1 ? 12 : m - 1;
      const prevMPadded = String(prevM).padStart(2, '0');
      prevStart = `${prevY}-${prevMPadded}-01`;
      prevEnd = `${prevY}-${prevMPadded}-31`;
    }

    // Current period metrics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentTx = db.prepare(`
      SELECT t.id, t.type, t.amount, t.description, t.date, t.category_id,
             c.name_en, c.name_uz, c.name_ru, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?
      ORDER BY t.amount DESC
    `).all(user.id, `${currentStart} 00:00:00`, `${currentEnd} 23:59:59`) as any[];

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalCashInflow = 0;
    let totalCashOutflow = 0;

    const categoryMap: Record<string, { id: string; name_en: string; name_uz: string; name_ru: string; color: string; total: number }> = {};
    const dailyExpensesMap: Record<string, number> = {};

    for (const t of currentTx) {
      const amt = Number(t.amount) || 0;
      const day = t.date ? t.date.substring(0, 10) : '';

      if (t.type === 'expense') {
        totalExpenses += amt;
        totalCashOutflow += amt;
        dailyExpensesMap[day] = (dailyExpensesMap[day] || 0) + amt;

        const catId = t.category_id || 'other';
        const catNameEn = t.name_en || 'Other';
        const catNameUz = t.name_uz || 'Boshqa';
        const catNameRu = t.name_ru || 'Прочее';
        const color = t.category_color || '#64748B';

        if (!categoryMap[catId]) {
          categoryMap[catId] = { id: catId, name_en: catNameEn, name_uz: catNameUz, name_ru: catNameRu, color, total: 0 };
        }
        categoryMap[catId].total += amt;
      } else if (t.type === 'income') {
        totalIncome += amt;
        totalCashInflow += amt;
      } else if (t.type === 'loan_given' || t.type === 'debt_repayment_made') {
        totalCashOutflow += amt;
      } else if (t.type === 'borrowing' || t.type === 'debt_repayment_received') {
        totalCashInflow += amt;
      }
    }

    const netCashFlow = totalCashInflow - totalCashOutflow;

    // Previous period metrics for comparison
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prevTx = db.prepare(`
      SELECT type, amount FROM transactions
      WHERE user_id = ? AND date >= ? AND date <= ?
    `).all(user.id, `${prevStart} 00:00:00`, `${prevEnd} 23:59:59`) as any[];

    let prevIncome = 0;
    let prevExpenses = 0;
    for (const p of prevTx) {
      const amt = Number(p.amount) || 0;
      if (p.type === 'expense') prevExpenses += amt;
      else if (p.type === 'income') prevIncome += amt;
    }

    const expensesChangePct = prevExpenses > 0 ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 100) : 0;
    const incomeChangePct = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : 0;

    // Largest expenses (top 5)
    const largestExpenses = currentTx.filter(t => t.type === 'expense').slice(0, 5);

    // Days count for average daily spending
    const startDateObj = new Date(currentStart);
    const endDateObj = new Date(currentEnd);
    const daysCount = Math.max(1, Math.round((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const averageDailySpending = Math.round(totalExpenses / daysCount);

    // Category breakdown with percentages
    const categoryBreakdown = Object.values(categoryMap).map(c => ({
      ...c,
      percentage: totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 100) : 0,
    })).sort((a, b) => b.total - a.total);

    // Outstanding debts snapshot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const debts = db.prepare(`
      SELECT type, original_amount, amount_repaid FROM debts WHERE user_id = ?
    `).all(user.id) as any[];

    let totalReceivables = 0;
    let totalLiabilities = 0;
    for (const d of debts) {
      const bal = Math.max(0, Number(d.original_amount) - Number(d.amount_repaid));
      if (d.type === 'lent') totalReceivables += bal;
      else totalLiabilities += bal;
    }

    return NextResponse.json({
      period,
      startDate: currentStart,
      endDate: currentEnd,
      totalIncome,
      totalExpenses,
      netCashFlow,
      prevIncome,
      prevExpenses,
      incomeChangePct,
      expensesChangePct,
      averageDailySpending,
      largestExpenses,
      categoryBreakdown,
      dailyExpensesMap,
      totalReceivables,
      totalLiabilities,
    });
  } catch (err: unknown) {
    console.error('Reports GET error:', err);
    return NextResponse.json({ error: 'Failed to generate financial reports' }, { status: 500 });
  }
}
