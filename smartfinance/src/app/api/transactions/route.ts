import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { formatLocalDate } from '@/lib/accounting';
import { runUserFinancialChecks } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const type = searchParams.get('type');
    const categoryId = searchParams.get('categoryId');
    const period = searchParams.get('period'); // today, yesterday, week, month, year, custom
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);
    const offset = Number(searchParams.get('offset')) || 0;

    const db = getDb();
    const whereClauses: string[] = ['t.user_id = ?'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [user.id];

    if (type && type !== 'all') {
      whereClauses.push('t.type = ?');
      params.push(type);
    }

    if (categoryId && categoryId !== 'all') {
      whereClauses.push('t.category_id = ?');
      params.push(categoryId);
    }

    if (search) {
      whereClauses.push('(t.description LIKE ? OR t.notes LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    // Period filters
    const now = new Date();
    const todayStr = formatLocalDate(now, user.timezone);

    if (period === 'today') {
      whereClauses.push('t.date LIKE ?');
      params.push(`${todayStr}%`);
    } else if (period === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yestStr = formatLocalDate(yesterday, user.timezone);
      whereClauses.push('t.date LIKE ?');
      params.push(`${yestStr}%`);
    } else if (period === 'week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const weekStartStr = formatLocalDate(monday, user.timezone);
      whereClauses.push('t.date >= ? AND t.date <= ?');
      params.push(`${weekStartStr} 00:00:00`, `${todayStr} 23:59:59`);
    } else if (period === 'month') {
      const currentMonth = todayStr.substring(0, 7);
      whereClauses.push('t.date LIKE ?');
      params.push(`${currentMonth}%`);
    } else if (period === 'year') {
      const currentYear = todayStr.substring(0, 4);
      whereClauses.push('t.date LIKE ?');
      params.push(`${currentYear}%`);
    } else if (period === 'custom' && startDate && endDate) {
      whereClauses.push('t.date >= ? AND t.date <= ?');
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    const whereSql = whereClauses.join(' AND ');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = db.prepare(`
      SELECT t.id, t.user_id, t.type, t.amount, t.description, t.date, t.notes,
             t.payment_method, t.category_id, t.related_debt_id, t.created_at,
             c.name_en, c.name_uz, c.name_ru, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${whereSql}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    // Total count for pagination
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE ${whereSql}
    `).get(...params) as any;

    return NextResponse.json({
      transactions,
      total: Number(countRow?.total) || 0,
      limit,
      offset,
    });
  } catch (err: unknown) {
    console.error('Transactions GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, amount, categoryId, description, date, notes, paymentMethod } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid positive amount is required' }, { status: 400 });
    }

    if (!description || !type) {
      return NextResponse.json({ error: 'Type and description are required' }, { status: 400 });
    }

    const db = getDb();
    const id = 'tx-' + crypto.randomUUID();
    const txDate = date || formatLocalDate(new Date(), user.timezone);

    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, category_id, description, date, notes, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      user.id,
      type,
      numAmount,
      categoryId || null,
      description.trim(),
      txDate,
      notes ? notes.trim() : null,
      paymentMethod || 'cash'
    );

    // If expense was created, check budget limits and trigger warnings asynchronously
    if (type === 'expense') {
      try {
        runUserFinancialChecks(user.id);
      } catch (e) {
        console.warn('Budget check warning:', e);
      }
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id,
        userId: user.id,
        type,
        amount: numAmount,
        categoryId,
        description: description.trim(),
        date: txDate,
        notes,
        paymentMethod,
      },
    });
  } catch (err: unknown) {
    console.error('Transactions POST error:', err);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
