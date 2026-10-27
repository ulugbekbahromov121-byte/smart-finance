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

    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recurring = db.prepare(`
      SELECT r.*, c.name_en, c.name_uz, c.name_ru, c.icon as category_icon, c.color as category_color
      FROM recurring_transactions r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ?
      ORDER BY r.next_due_date ASC
    `).all(user.id) as any[];

    return NextResponse.json({ recurring });
  } catch (err: unknown) {
    console.error('Recurring GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch recurring transactions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, amount, categoryId, description, frequency, nextDueDate } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid positive amount is required' }, { status: 400 });
    }

    if (!description || !frequency || !['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      return NextResponse.json({ error: 'Description and valid frequency are required' }, { status: 400 });
    }

    const db = getDb();
    const id = 'rec-' + crypto.randomUUID();
    const dueDate = nextDueDate || formatLocalDate(new Date(), user.timezone);

    db.prepare(`
      INSERT INTO recurring_transactions (id, user_id, type, amount, category_id, description, frequency, next_due_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, user.id, type || 'expense', numAmount, categoryId || null, description.trim(), frequency, dueDate);

    return NextResponse.json({
      success: true,
      recurring: {
        id,
        userId: user.id,
        type: type || 'expense',
        amount: numAmount,
        categoryId,
        description: description.trim(),
        frequency,
        nextDueDate: dueDate,
        isActive: 1,
      },
    });
  } catch (err: unknown) {
    console.error('Recurring POST error:', err);
    return NextResponse.json({ error: 'Failed to create recurring transaction' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, isActive, amount, description, nextDueDate } = body;

    const db = getDb();
    db.prepare(`
      UPDATE recurring_transactions
      SET is_active = COALESCE(?, is_active),
          amount = COALESCE(?, amount),
          description = COALESCE(?, description),
          next_due_date = COALESCE(?, next_due_date),
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(isActive, amount, description, nextDueDate, id, user.id);

    return NextResponse.json({ success: true, message: 'Recurring transaction updated' });
  } catch (err: unknown) {
    console.error('Recurring PUT error:', err);
    return NextResponse.json({ error: 'Failed to update recurring transaction' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const db = getDb();
    db.prepare('DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?').run(id, user.id);

    return NextResponse.json({ success: true, message: 'Recurring transaction deleted' });
  } catch (err: unknown) {
    console.error('Recurring DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete recurring transaction' }, { status: 500 });
  }
}
