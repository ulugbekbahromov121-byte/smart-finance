import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserBudgetsStatus } from '@/lib/accounting';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const budgets = getUserBudgetsStatus(user.id, user.timezone, user.language);
    return NextResponse.json({ budgets });
  } catch (err: unknown) {
    console.error('Budgets GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { categoryId, period, amount, warningThresholdPercent } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid positive amount is required' }, { status: 400 });
    }

    const validPeriod = ['daily', 'weekly', 'monthly'].includes(period) ? period : 'monthly';
    const threshold = Number(warningThresholdPercent) || 80;

    const db = getDb();
    const id = 'bud-' + crypto.randomUUID();

    db.prepare(`
      INSERT INTO budgets (id, user_id, category_id, period, amount, warning_threshold_percent, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, user.id, categoryId || null, validPeriod, numAmount, threshold);

    return NextResponse.json({
      success: true,
      budget: {
        id,
        userId: user.id,
        categoryId: categoryId || null,
        period: validPeriod,
        amount: numAmount,
        warningThresholdPercent: threshold,
      },
    });
  } catch (err: unknown) {
    console.error('Budgets POST error:', err);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}
