import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, comparePassword, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { password } = body;

    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRecord = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as any;
    if (!userRecord || !comparePassword(password, userRecord.password_hash)) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 400 });
    }

    // SQLite CASCADE foreign keys will delete transactions, budgets, debts, payments, notifications
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

    const res = NextResponse.json({ success: true, message: 'Account deleted' });
    res.cookies.delete(TOKEN_COOKIE_NAME);
    return res;
  } catch (err: unknown) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
