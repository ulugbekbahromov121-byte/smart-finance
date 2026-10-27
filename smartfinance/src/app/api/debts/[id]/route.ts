import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const db = getDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const debt = db.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payments = db.prepare(`
      SELECT * FROM debt_payments WHERE debt_id = ? AND user_id = ? ORDER BY payment_date DESC, created_at DESC
    `).all(id, user.id) as any[];

    return NextResponse.json({
      debt,
      payments,
    });
  } catch (err: unknown) {
    console.error('Debt GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch debt' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { counterpartyName, dueDate, notes, status } = body;

    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = db.prepare('SELECT id FROM debts WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE debts
      SET counterparty_name = COALESCE(?, counterparty_name),
          due_date = COALESCE(?, due_date),
          notes = COALESCE(?, notes),
          status = COALESCE(?, status),
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(counterpartyName, dueDate, notes, status, id, user.id);

    return NextResponse.json({ success: true, message: 'Debt updated' });
  } catch (err: unknown) {
    console.error('Debt PUT error:', err);
    return NextResponse.json({ error: 'Failed to update debt' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const db = getDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = db.prepare('SELECT id FROM debts WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    // Delete related transactions and payments, then debt
    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('DELETE FROM transactions WHERE related_debt_id = ? AND user_id = ?').run(id, user.id);
      db.prepare('DELETE FROM debt_payments WHERE debt_id = ? AND user_id = ?').run(id, user.id);
      db.prepare('DELETE FROM debts WHERE id = ? AND user_id = ?').run(id, user.id);
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }

    return NextResponse.json({ success: true, message: 'Debt deleted' });
  } catch (err: unknown) {
    console.error('Debt DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete debt' }, { status: 500 });
  }
}
