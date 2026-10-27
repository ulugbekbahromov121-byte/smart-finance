import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(user.id) as any;

    if (!prefs) {
      db.prepare(`
        INSERT INTO notification_preferences (user_id, budget_warning, budget_exceeded, debt_due_reminders, overdue_reminders, reminder_days_before)
        VALUES (?, 1, 1, 1, 1, 1)
      `).run(user.id);
      prefs = {
        budget_warning: 1,
        budget_exceeded: 1,
        debt_due_reminders: 1,
        overdue_reminders: 1,
        reminder_days_before: 1,
      };
    }

    return NextResponse.json({ preferences: prefs });
  } catch (err: unknown) {
    console.error('Preferences GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { budgetWarning, budgetExceeded, debtDueReminders, overdueReminders, reminderDaysBefore } = body;

    const db = getDb();
    db.prepare(`
      INSERT INTO notification_preferences (user_id, budget_warning, budget_exceeded, debt_due_reminders, overdue_reminders, reminder_days_before, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        budget_warning = excluded.budget_warning,
        budget_exceeded = excluded.budget_exceeded,
        debt_due_reminders = excluded.debt_due_reminders,
        overdue_reminders = excluded.overdue_reminders,
        reminder_days_before = excluded.reminder_days_before,
        updated_at = datetime('now')
    `).run(
      user.id,
      budgetWarning ? 1 : 0,
      budgetExceeded ? 1 : 0,
      debtDueReminders ? 1 : 0,
      overdueReminders ? 1 : 0,
      Number(reminderDaysBefore) || 1
    );

    return NextResponse.json({ success: true, message: 'Preferences updated' });
  } catch (err: unknown) {
    console.error('Preferences PUT error:', err);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
