import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const db = getDb();

    // Query system default categories (user_id IS NULL) OR user custom categories (user_id = user.id)
    const userId = user?.id || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categories = db.prepare(`
      SELECT id, user_id, name_en, name_uz, name_ru, type, icon, color, is_default
      FROM categories
      WHERE user_id IS NULL OR user_id = ?
      ORDER BY is_default DESC, name_en ASC
    `).all(userId) as any[];

    return NextResponse.json({ categories });
  } catch (err: unknown) {
    console.error('Categories GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { nameEn, nameUz, nameRu, type, icon, color } = body;

    if (!nameEn || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    const db = getDb();
    const id = 'cat-' + crypto.randomUUID();

    db.prepare(`
      INSERT INTO categories (id, user_id, name_en, name_uz, name_ru, type, icon, color, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      user.id,
      nameEn.trim(),
      (nameUz || nameEn).trim(),
      (nameRu || nameEn).trim(),
      type,
      icon || 'Tag',
      color || '#6366F1'
    );

    return NextResponse.json({
      success: true,
      category: {
        id,
        userId: user.id,
        nameEn,
        nameUz: nameUz || nameEn,
        nameRu: nameRu || nameEn,
        type,
        icon: icon || 'Tag',
        color: color || '#6366F1',
      },
    });
  } catch (err: unknown) {
    console.error('Categories POST error:', err);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
