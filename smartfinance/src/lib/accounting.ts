import { getDb } from './db';

export interface FinancialSummary {
  openingBalance: number;
  availableBalance: number;
  todayExpenses: number;
  todayIncome: number;
  todayNet: number;
  monthExpenses: number;
  monthIncome: number;
  monthNet: number;
  totalReceivables: number; // Money lent to others outstanding
  totalLiabilities: number;   // Money borrowed from others outstanding
  debtsDueTodayCount: number;
  overdueDebtsCount: number;
}

export interface BudgetStatusInfo {
  id: string;
  categoryId: string | null;
  categoryName: string;
  period: 'daily' | 'weekly' | 'monthly';
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  warningThreshold: number;
  status: 'normal' | 'warning' | 'critical' | 'exceeded';
}

/**
 * Calculate user's complete financial metrics with strict accounting rules:
 * - Ordinary expenses and ordinary income are kept separate from debt principal.
 * - Lending reduces available cash and increases receivables.
 * - Borrowing increases available cash and increases liabilities.
 * - Repayment of debt reduces cash and reduces liability.
 * - Receipt of debt repayment increases cash and reduces receivable.
 */
export function getFinancialSummary(userId: string, timezone: string = 'Asia/Tashkent'): FinancialSummary {
  const db = getDb();

  // Get user's opening balance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = db.prepare('SELECT opening_balance FROM users WHERE id = ?').get(userId) as any;
  const openingBalance = user ? Number(user.opening_balance) : 0;

  // Compute local today's date YYYY-MM-DD
  const now = new Date();
  const todayStr = formatLocalDate(now, timezone);
  const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

  // Fetch all transactions for cash balance calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions = db.prepare(`
    SELECT type, amount, date
    FROM transactions
    WHERE user_id = ?
  `).all(userId) as any[];

  let totalCashInflow = 0;
  let totalCashOutflow = 0;
  let todayExpenses = 0;
  let todayIncome = 0;
  let todayInflow = 0;
  let todayOutflow = 0;
  let monthExpenses = 0;
  let monthIncome = 0;
  let monthInflow = 0;
  let monthOutflow = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    const txDate = tx.date ? tx.date.substring(0, 10) : '';
    const isToday = txDate === todayStr;
    const isThisMonth = txDate.startsWith(currentMonthPrefix);

    switch (tx.type) {
      case 'expense':
        totalCashOutflow += amt;
        if (isToday) {
          todayExpenses += amt;
          todayOutflow += amt;
        }
        if (isThisMonth) {
          monthExpenses += amt;
          monthOutflow += amt;
        }
        break;

      case 'income':
        totalCashInflow += amt;
        if (isToday) {
          todayIncome += amt;
          todayInflow += amt;
        }
        if (isThisMonth) {
          monthIncome += amt;
          monthInflow += amt;
        }
        break;

      case 'loan_given': // User lent money to someone: cash outflow, receivable up
        totalCashOutflow += amt;
        if (isToday) todayOutflow += amt;
        if (isThisMonth) monthOutflow += amt;
        break;

      case 'borrowing': // User borrowed money from someone: cash inflow, liability up
        totalCashInflow += amt;
        if (isToday) todayInflow += amt;
        if (isThisMonth) monthInflow += amt;
        break;

      case 'debt_repayment_received': // Debtor paid user back: cash inflow
        totalCashInflow += amt;
        if (isToday) todayInflow += amt;
        if (isThisMonth) monthInflow += amt;
        break;

      case 'debt_repayment_made': // User paid lender back: cash outflow
        totalCashOutflow += amt;
        if (isToday) todayOutflow += amt;
        if (isThisMonth) monthOutflow += amt;
        break;

      case 'transfer':
        // Transfer between user's own accounts does not change overall cash
        break;
    }
  }

  const availableBalance = openingBalance + totalCashInflow - totalCashOutflow;
  const todayNet = todayInflow - todayOutflow;
  const monthNet = monthInflow - monthOutflow;

  // Receivables & Liabilities from debts table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debts = db.prepare(`
    SELECT type, original_amount, amount_repaid, due_date, status
    FROM debts
    WHERE user_id = ?
  `).all(userId) as any[];

  let totalReceivables = 0;
  let totalLiabilities = 0;
  let debtsDueTodayCount = 0;
  let overdueDebtsCount = 0;

  for (const d of debts) {
    const orig = Number(d.original_amount) || 0;
    const repaid = Number(d.amount_repaid) || 0;
    const outstanding = Math.max(0, orig - repaid);

    if (d.type === 'lent') {
      totalReceivables += outstanding;
    } else if (d.type === 'borrowed') {
      totalLiabilities += outstanding;
    }

    if (outstanding > 0) {
      if (d.due_date === todayStr) {
        debtsDueTodayCount++;
      } else if (d.due_date < todayStr) {
        overdueDebtsCount++;
      }
    }
  }

  return {
    openingBalance,
    availableBalance,
    todayExpenses,
    todayIncome,
    todayNet,
    monthExpenses,
    monthIncome,
    monthNet,
    totalReceivables,
    totalLiabilities,
    debtsDueTodayCount,
    overdueDebtsCount,
  };
}

/**
 * Format local calendar date YYYY-MM-DD
 */
export function formatLocalDate(date: Date, timezone: string = 'Asia/Tashkent'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().substring(0, 10);
  }
}

/**
 * Calculate user's active budgets and their current spent amounts.
 */
export function getUserBudgetsStatus(userId: string, timezone: string = 'Asia/Tashkent', lang: string = 'en'): BudgetStatusInfo[] {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budgets = db.prepare(`
    SELECT b.id, b.category_id, b.period, b.amount, b.warning_threshold_percent,
           c.name_en, c.name_uz, c.name_ru
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ? AND b.is_active = 1
  `).all(userId) as any[];

  if (!budgets.length) return [];

  const now = new Date();
  const todayStr = formatLocalDate(now, timezone);
  const currentMonth = todayStr.substring(0, 7);

  // Compute start of week (Monday)
  const d = new Date(now);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  const weekStartStr = formatLocalDate(monday, timezone);

  const results: BudgetStatusInfo[] = [];

  for (const b of budgets) {
    let dateFilter = '';
    const params: (string | number)[] = [userId];

    if (b.period === 'daily') {
      dateFilter = 'AND date LIKE ?';
      params.push(`${todayStr}%`);
    } else if (b.period === 'weekly') {
      dateFilter = 'AND date >= ? AND date <= ?';
      params.push(`${weekStartStr} 00:00:00`, `${todayStr} 23:59:59`);
    } else {
      // monthly
      dateFilter = 'AND date LIKE ?';
      params.push(`${currentMonth}%`);
    }

    let categoryFilter = '';
    if (b.category_id) {
      categoryFilter = 'AND category_id = ?';
      params.push(b.category_id);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spentRow = db.prepare(`
      SELECT SUM(amount) as total_spent
      FROM transactions
      WHERE user_id = ? AND type = 'expense' ${dateFilter} ${categoryFilter}
    `).get(...params) as any;

    const spent = Number(spentRow?.total_spent) || 0;
    const limitAmount = Number(b.amount) || 1;
    const remaining = Math.max(0, limitAmount - spent);
    const percentage = Math.round((spent / limitAmount) * 100);
    const warningThreshold = Number(b.warning_threshold_percent) || 80;

    let status: 'normal' | 'warning' | 'critical' | 'exceeded' = 'normal';
    if (percentage >= 100) {
      status = 'exceeded';
    } else if (percentage >= 90) {
      status = 'critical';
    } else if (percentage >= warningThreshold) {
      status = 'warning';
    }

    let catName = 'Overall Spending';
    if (b.category_id) {
      catName = lang === 'uz' ? (b.name_uz || b.name_en) : lang === 'ru' ? (b.name_ru || b.name_en) : b.name_en;
    }

    results.push({
      id: b.id,
      categoryId: b.category_id,
      categoryName: catName,
      period: b.period,
      amount: limitAmount,
      spent,
      remaining,
      percentage,
      warningThreshold,
      status,
    });
  }

  return results;
}
