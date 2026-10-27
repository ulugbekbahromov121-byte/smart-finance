import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id) as any;

    return NextResponse.json({
      authenticated: true,
      user,
      unreadNotifications: Number(unreadCount?.count) || 0,
    });
  } catch (err: unknown) {
    console.error('Auth me error:', err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
