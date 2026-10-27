import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hashPassword, comparePassword } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const { currentPassword, newPassword, email } = body;

    const db = getDb();

    if (user) {
      // Authenticated user changing password
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Both current and new passwords are required' }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userRecord = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as any;
      if (!userRecord || !comparePassword(currentPassword, userRecord.password_hash)) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }

      db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(hashPassword(newPassword), user.id);

      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } else {
      // Unauthenticated reset flow
      if (!email || !newPassword) {
        return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userRecord = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
      if (!userRecord) {
        // Return 404
        return NextResponse.json({ error: 'User with this email not found' }, { status: 404 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }

      db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(hashPassword(newPassword), userRecord.id);

      return NextResponse.json({ success: true, message: 'Password reset successfully' });
    }
  } catch (err: unknown) {
    console.error('Password reset error:', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
