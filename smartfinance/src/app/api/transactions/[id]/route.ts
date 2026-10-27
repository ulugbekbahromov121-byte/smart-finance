import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { runUserFinancialChecks } from '@/lib/notifications';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { amount, categoryId, description, date, notes, paymentMethod, type } = body;

    const db = getDb();
    // Verify ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = db.prepare('SELECT id, user_id FROM transactions WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found or access denied' }, { status: 404 });
    }

    const numAmount = amount !== undefined ? parseFloat(amount) : undefined;
    if (numAmount !== undefined && (isNaN(numAmount) || numAmount <= 0)) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    db.prepare(`
      UPDATE transactions
      SET amount = COALESCE(?, amount),
          category_id = COALESCE(?, category_id),
          description = COALESCE(?, description),
          date = COALESCE(?, date),
          notes = COALESCE(?, notes),
          payment_method = COALESCE(?, payment_method),
          type = COALESCE(?, type),
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(numAmount, categoryId, description, date, notes, paymentMethod, type, id, user.id);

    try {
      runUserFinancialChecks(user.id);
    } catch {
      // non-blocking
    }

    return NextResponse.json({ success: true, message: 'Transaction updated' });
  } catch (err: unknown) {
    console.error('Transaction PUT error:', err);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
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

    // Verify ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = db.prepare('SELECT id, related_debt_id FROM transactions WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found or access denied' }, { status: 404 });
    }

    db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, user.id);

    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (err: unknown) {
    console.error('Transaction DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
