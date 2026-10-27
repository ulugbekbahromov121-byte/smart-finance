import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getFinancialSummary, getUserBudgetsStatus, formatLocalDate } from '@/lib/accounting';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const summary = getFinancialSummary(user.id, user.timezone);
    const budgets = getUserBudgetsStatus(user.id, user.timezone, user.language);

    const now = new Date();
    const todayStr = formatLocalDate(now, user.timezone);

    // Recent 8 transactions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentTransactions = db.prepare(`
      SELECT t.id, t.type, t.amount, t.description, t.date, t.notes, t.payment_method,
             c.name_en, c.name_uz, c.name_ru, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 8
    `).all(user.id) as any[];

    // Upcoming debt repayment deadlines (next 14 days)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upcomingDebts = db.prepare(`
      SELECT id, type, counterparty_name, original_amount, amount_repaid, due_date, status
      FROM debts
      WHERE user_id = ? AND status != 'fully_repaid' AND due_date >= ?
      ORDER BY due_date ASC
      LIMIT 5
    `).all(user.id, todayStr) as any[];

    // Last 7 days expenses for trend chart
    const last7Days: { date: string; label: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = formatLocalDate(d, user.timezone);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = db.prepare(`
        SELECT SUM(amount) as total FROM transactions
        WHERE user_id = ? AND type = 'expense' AND date LIKE ?
      `).get(user.id, `${dStr}%`) as any;

      last7Days.push({
        date: dStr,
        label: dStr.substring(5), // MM-DD
        amount: Number(row?.total) || 0,
      });
    }

    // Category breakdown for current month
    const currentMonth = todayStr.substring(0, 7);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryRows = db.prepare(`
      SELECT t.category_id, SUM(t.amount) as total,
             c.name_en, c.name_uz, c.name_ru, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'expense' AND t.date LIKE ?
      GROUP BY t.category_id
      ORDER BY total DESC
      LIMIT 5
    `).all(user.id, `${currentMonth}%`) as any[];

    return NextResponse.json({
      summary,
      budgets,
      recentTransactions,
      upcomingDebts,
      last7Days,
      categoryShare: categoryRows,
    });
  } catch (err: unknown) {
    console.error('Dashboard GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
