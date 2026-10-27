import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { amount, warningThresholdPercent, period, categoryId, isActive } = body;

    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = db.prepare('SELECT id FROM budgets WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE budgets
      SET amount = COALESCE(?, amount),
          warning_threshold_percent = COALESCE(?, warning_threshold_percent),
          period = COALESCE(?, period),
          category_id = COALESCE(?, category_id),
          is_active = COALESCE(?, is_active),
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(amount, warningThresholdPercent, period, categoryId, isActive, id, user.id);

    return NextResponse.json({ success: true, message: 'Budget updated' });
  } catch (err: unknown) {
    console.error('Budget PUT error:', err);
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
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
    const existing = db.prepare('SELECT id FROM budgets WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(id, user.id);
    return NextResponse.json({ success: true, message: 'Budget deleted' });
  } catch (err: unknown) {
    console.error('Budget DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 });
  }
}
