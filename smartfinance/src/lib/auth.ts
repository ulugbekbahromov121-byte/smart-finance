import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getDb } from './db';
import { SupportedLanguage } from './i18n';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_finance_default_jwt_secret_key_2026';
export const TOKEN_COOKIE_NAME = 'sf_auth_token';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  language: SupportedLanguage;
  currency: string;
  timezone: string;
  openingBalance: number;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

/**
 * Extract authenticated user session from NextRequest cookies or Authorization header.
 * Enforces strict authentication and returns full user details.
 */
export async function getAuthUser(req?: NextRequest): Promise<UserSession | null> {
  let token: string | undefined;

  if (req) {
    // 1. Check Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2. Check NextRequest cookies
    if (!token) {
      token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    }
  }

  // 3. Check next/headers cookies if not in request
  if (!token) {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    } catch {
      // Ignored if outside request context
    }
  }

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) return null;

  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = db.prepare('SELECT id, email, full_name, language, currency, timezone, opening_balance FROM users WHERE id = ?').get(decoded.userId) as any;

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    language: (user.language as SupportedLanguage) || 'en',
    currency: user.currency || 'UZS',
    timezone: user.timezone || 'Asia/Tashkent',
    openingBalance: Number(user.opening_balance) || 0,
  };
}
