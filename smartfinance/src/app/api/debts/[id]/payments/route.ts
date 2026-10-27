import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { formatLocalDate } from '@/lib/accounting';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { amount, paymentDate, notes } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid repayment amount is required' }, { status: 400 });
    }

    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const debt = db.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    const origAmount = Number(debt.original_amount) || 0;
    const currentRepaid = Number(debt.amount_repaid) || 0;
    const outstanding = Math.max(0, origAmount - currentRepaid);

    if (numAmount > outstanding) {
      return NextResponse.json({
        error: `Repayment amount (${numAmount}) cannot exceed remaining balance (${outstanding})`,
      }, { status: 400 });
    }

    const newRepaid = currentRepaid + numAmount;
    let newStatus: 'active' | 'partially_repaid' | 'fully_repaid' | 'overdue' = 'partially_repaid';
    if (newRepaid >= origAmount) {
      newStatus = 'fully_repaid';
    } else {
      const todayStr = formatLocalDate(new Date(), user.timezone);
      if (debt.due_date < todayStr) {
        newStatus = 'overdue';
      }
    }

    const paymentId = 'pay-' + crypto.randomUUID();
    const txId = 'tx-' + crypto.randomUUID();
    const actualPaymentDate = paymentDate || formatLocalDate(new Date(), user.timezone);

    // Accounting rule:
    // If user lent money: debt_repayment_received -> cash increases, receivable decreases
    // If user borrowed money: debt_repayment_made -> cash decreases, liability decreases
    const txType = debt.type === 'lent' ? 'debt_repayment_received' : 'debt_repayment_made';
    const txDesc = debt.type === 'lent'
      ? `Debt repayment from ${debt.counterparty_name}`
      : `Debt repayment to ${debt.counterparty_name}`;

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Record payment row
      db.prepare(`
        INSERT INTO debt_payments (id, debt_id, user_id, amount, payment_date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(paymentId, id, user.id, numAmount, actualPaymentDate, notes ? notes.trim() : null);

      // 2. Update debt record
      db.prepare(`
        UPDATE debts
        SET amount_repaid = ?, status = ?, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(newRepaid, newStatus, id, user.id);

      // 3. Record cash flow transaction
      db.prepare(`
        INSERT INTO transactions (id, user_id, type, amount, description, date, notes, related_debt_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(txId, user.id, txType, numAmount, txDesc, actualPaymentDate, notes ? notes.trim() : null, id);

      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: paymentId,
        debtId: id,
        amount: numAmount,
        paymentDate: actualPaymentDate,
        notes,
      },
      updatedDebt: {
        id,
        originalAmount: origAmount,
        amountRepaid: newRepaid,
        outstandingBalance: Math.max(0, origAmount - newRepaid),
        status: newStatus,
      },
    });
  } catch (err: unknown) {
    console.error('Debt payment error:', err);
    return NextResponse.json({ error: 'Failed to record repayment' }, { status: 500 });
  }
}
