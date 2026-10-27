import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import crypto from 'crypto';
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
    const type = searchParams.get('type'); // lent | borrowed | all
    const status = searchParams.get('status'); // active | partially_repaid | fully_repaid | overdue | all

    const db = getDb();
    const todayStr = formatLocalDate(new Date(), user.timezone);

    // Fetch all debts for user to calculate summary metrics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allDebts = db.prepare(`
      SELECT * FROM debts WHERE user_id = ? ORDER BY due_date ASC
    `).all(user.id) as any[];

    let totalLent = 0;
    let totalBorrowed = 0;
    let expectedToReturn = 0; // remaining lent
    let stillToRepay = 0; // remaining borrowed
    let dueTodayCount = 0;
    let overdueCount = 0;

    for (const d of allDebts) {
      const orig = Number(d.original_amount) || 0;
      const repaid = Number(d.amount_repaid) || 0;
      const outstanding = Math.max(0, orig - repaid);

      // Check overdue dynamically
      if (outstanding > 0 && d.status !== 'fully_repaid') {
        if (d.due_date < todayStr && d.status !== 'overdue') {
          db.prepare('UPDATE debts SET status = \'overdue\' WHERE id = ?').run(d.id);
          d.status = 'overdue';
        }
      }

      if (d.type === 'lent') {
        totalLent += orig;
        expectedToReturn += outstanding;
      } else {
        totalBorrowed += orig;
        stillToRepay += outstanding;
      }

      if (outstanding > 0) {
        if (d.due_date === todayStr) dueTodayCount++;
        else if (d.due_date < todayStr) overdueCount++;
      }
    }

    // Filter list according to query parameters
    let filtered = allDebts;
    if (type && type !== 'all') {
      filtered = filtered.filter(d => d.type === type);
    }
    if (status && status !== 'all') {
      filtered = filtered.filter(d => d.status === status);
    }

    return NextResponse.json({
      summary: {
        totalLent,
        totalBorrowed,
        expectedToReturn,
        stillToRepay,
        dueTodayCount,
        overdueCount,
      },
      debts: filtered,
    });
  } catch (err: unknown) {
    console.error('Debts GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch debts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, counterpartyName, originalAmount, lentDate, dueDate, notes } = body;

    const numAmount = parseFloat(originalAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid positive amount is required' }, { status: 400 });
    }

    if (!counterpartyName || !type || !['lent', 'borrowed'].includes(type)) {
      return NextResponse.json({ error: 'Counterparty name and type (lent/borrowed) are required' }, { status: 400 });
    }

    const db = getDb();
    const debtId = 'debt-' + crypto.randomUUID();
    const txId = 'tx-' + crypto.randomUUID();

    const todayStr = formatLocalDate(new Date(), user.timezone);
    const actualLentDate = lentDate || todayStr;
    const actualDueDate = dueDate || todayStr;

    let initialStatus: 'active' | 'overdue' = 'active';
    if (actualDueDate < todayStr) {
      initialStatus = 'overdue';
    }

    // Atomic transaction: Insert debt record and corresponding cash-flow transaction
    // Lending reduces available cash (type: 'loan_given')
    // Borrowing increases available cash (type: 'borrowing')
    const txType = type === 'lent' ? 'loan_given' : 'borrowing';
    const txDesc = type === 'lent'
      ? `Money lent to ${counterpartyName.trim()}`
      : `Money borrowed from ${counterpartyName.trim()}`;

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO debts (id, user_id, type, counterparty_name, original_amount, amount_repaid, lent_date, due_date, notes, status)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `).run(
        debtId,
        user.id,
        type,
        counterpartyName.trim(),
        numAmount,
        actualLentDate,
        actualDueDate,
        notes ? notes.trim() : null,
        initialStatus
      );

      db.prepare(`
        INSERT INTO transactions (id, user_id, type, amount, description, date, notes, related_debt_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        user.id,
        txType,
        numAmount,
        txDesc,
        actualLentDate,
        notes ? notes.trim() : null,
        debtId
      );

      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }

    return NextResponse.json({
      success: true,
      debt: {
        id: debtId,
        userId: user.id,
        type,
        counterpartyName: counterpartyName.trim(),
        originalAmount: numAmount,
        amountRepaid: 0,
        lentDate: actualLentDate,
        dueDate: actualDueDate,
        notes,
        status: initialStatus,
      },
    });
  } catch (err: unknown) {
    console.error('Debts POST error:', err);
    return NextResponse.json({ error: 'Failed to record debt' }, { status: 500 });
  }
}
