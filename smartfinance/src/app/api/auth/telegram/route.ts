import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { generateToken, hashPassword, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { verifyTelegramInitData } from '@/lib/telegramAuth';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8942245391:AAH5bn66CbwDM7Tbe5w5Zyt7Q6otmEFSZy8';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { initData } = body;

    if (!initData) {
      return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
    }

    const verification = verifyTelegramInitData(initData, BOT_TOKEN);

    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'Invalid Telegram authentication signature', details: verification.error },
        { status: 401 }
      );
    }

    const tgUser = verification.user;
    const db = getDb();

    // Ensure telegram_id column exists
    try {
      db.exec('ALTER TABLE users ADD COLUMN telegram_id TEXT;');
    } catch {
      // Column already exists
    }

    const email = `tg_${tgUser.id}@telegram.user`;
    const tgIdStr = String(tgUser.id);

    // Look for existing user by telegram_id or email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user = db.prepare('SELECT * FROM users WHERE telegram_id = ? OR email = ?').get(tgIdStr, email) as any;

    if (!user) {
      // Create new user for this Telegram account
      const userId = 'usr-tg-' + tgUser.id;
      const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() || tgUser.username || 'Telegram User';
      const userLang = tgUser.language_code?.startsWith('ru')
        ? 'ru'
        : tgUser.language_code?.startsWith('uz')
        ? 'uz'
        : 'en';
      const randomPass = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(randomPass);

      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, language, currency, timezone, opening_balance, telegram_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, email, passwordHash, fullName, userLang, 'UZS', 'Asia/Tashkent', 0, tgIdStr);

      // Default notification preferences
      try {
        db.prepare(`
          INSERT INTO notification_preferences (user_id, budget_warning, budget_exceeded, debt_due_reminders, overdue_reminders, reminder_days_before)
          VALUES (?, 1, 1, 1, 1, 1)
        `).run(userId);
      } catch {
        // Ignored if already exists
      }

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } else {
      // Ensure telegram_id is set
      if (!user.telegram_id) {
        db.prepare('UPDATE users SET telegram_id = ? WHERE id = ?').run(tgIdStr, user.id);
      }
    }

    const token = generateToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        language: user.language,
        currency: user.currency,
        timezone: user.timezone,
        openingBalance: Number(user.opening_balance) || 0,
      },
    });

    // Set secure cookie suitable for both browser and iframe/Telegram Webview
    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return response;
  } catch (err: unknown) {
    console.error('Telegram auth error:', err);
    return NextResponse.json({ error: 'Telegram authentication failed' }, { status: 500 });
  }
}
