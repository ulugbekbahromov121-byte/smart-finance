import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { formatLocalDate } from '@/lib/accounting';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const todayStr = formatLocalDate(new Date(), user.timezone);

    // Fetch active recurring items due today or earlier
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dueItems = db.prepare(`
      SELECT * FROM recurring_transactions
      WHERE user_id = ? AND is_active = 1 AND next_due_date <= ?
    `).all(user.id, todayStr) as any[];

    let processedCount = 0;

    for (const item of dueItems) {
      // Check if already processed for this next_due_date to prevent duplication
      if (item.last_processed_date === item.next_due_date) {
        continue;
      }

      const txId = 'tx-' + crypto.randomUUID();
      const amount = Number(item.amount) || 0;

      // Compute next due date depending on frequency
      const curDue = new Date(item.next_due_date);
      let nextDue = new Date(curDue);

      if (item.frequency === 'daily') {
        nextDue.setDate(curDue.getDate() + 1);
      } else if (item.frequency === 'weekly') {
        nextDue.setDate(curDue.getDate() + 7);
      } else if (item.frequency === 'monthly') {
        nextDue.setMonth(curDue.getMonth() + 1);
      } else if (item.frequency === 'yearly') {
        nextDue.setFullYear(curDue.getFullYear() + 1);
      }
      const nextDueStr = formatLocalDate(nextDue, user.timezone);

      db.exec('BEGIN TRANSACTION;');
      try {
        // Insert transaction
        db.prepare(`
          INSERT INTO transactions (id, user_id, type, amount, category_id, description, date, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          txId,
          user.id,
          item.type,
          amount,
          item.category_id,
          item.description,
          item.next_due_date,
          'Auto-recorded recurring transaction'
        );

        // Update recurring schedule
        db.prepare(`
          UPDATE recurring_transactions
          SET last_processed_date = ?, next_due_date = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(item.next_due_date, nextDueStr, item.id);

        db.exec('COMMIT;');
        processedCount++;
      } catch (e) {
        db.exec('ROLLBACK;');
        console.error('Error processing recurring item:', item.id, e);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount,
      message: `Processed ${processedCount} recurring transaction(s).`,
    });
  } catch (err: unknown) {
    console.error('Recurring process error:', err);
    return NextResponse.json({ error: 'Failed to process recurring transactions' }, { status: 500 });
  }
}
