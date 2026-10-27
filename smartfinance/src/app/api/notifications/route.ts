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
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(user.id) as any[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(user.id) as any;

    return NextResponse.json({
      notifications,
      unreadCount: Number(unreadCount?.count) || 0,
    });
  } catch (err: unknown) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, id } = body; // action: 'mark_all_read' | 'mark_read' | 'clear_all'
    const db = getDb();

    if (action === 'mark_all_read') {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(user.id);
    } else if (action === 'mark_read' && id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, user.id);
    } else if (action === 'clear_all') {
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Notifications PUT error:', err);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
