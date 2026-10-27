import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { hashPassword, generateToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName, language, currency, timezone, openingBalance } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = getDb();

    // Check if email already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const userId = 'usr-' + crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const userLang = ['en', 'uz', 'ru'].includes(language) ? language : 'en';
    const userCurrency = currency || 'UZS';
    const userTimezone = timezone || 'Asia/Tashkent';
    const userBalance = Number(openingBalance) || 0;

    // Insert user
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, language, currency, timezone, opening_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email.toLowerCase().trim(), passwordHash, fullName.trim(), userLang, userCurrency, userTimezone, userBalance);

    // Insert default notification preferences
    db.prepare(`
      INSERT INTO notification_preferences (user_id, budget_warning, budget_exceeded, debt_due_reminders, overdue_reminders, reminder_days_before)
      VALUES (?, 1, 1, 1, 1, 1)
    `).run(userId);

    const token = generateToken({ userId, email: email.toLowerCase().trim() });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        fullName: fullName.trim(),
        language: userLang,
        currency: userCurrency,
        timezone: userTimezone,
        openingBalance: userBalance,
      },
    });

    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
