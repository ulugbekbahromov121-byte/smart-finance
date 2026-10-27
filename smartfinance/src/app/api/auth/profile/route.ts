import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, language, currency, timezone, openingBalance } = body;

    const db = getDb();
    const newName = fullName ? fullName.trim() : user.fullName;
    const newLang = ['en', 'uz', 'ru'].includes(language) ? language : user.language;
    const newCurr = currency || user.currency;
    const newTz = timezone || user.timezone;
    const newBal = openingBalance !== undefined ? Number(openingBalance) : user.openingBalance;

    db.prepare(`
      UPDATE users
      SET full_name = ?, language = ?, currency = ?, timezone = ?, opening_balance = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newName, newLang, newCurr, newTz, newBal, user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: newName,
        language: newLang,
        currency: newCurr,
        timezone: newTz,
        openingBalance: newBal,
      },
    });
  } catch (err: unknown) {
    console.error('Update profile error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
