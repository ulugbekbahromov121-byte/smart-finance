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

    const format = req.nextUrl.searchParams.get('format') || 'json';
    const db = getDb();

    // Fetch transactions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = db.prepare(`
      SELECT t.id, t.type, t.amount, t.description, t.date, t.notes, t.payment_method,
             c.name_en as category_en, c.name_uz as category_uz, c.name_ru as category_ru
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
      ORDER BY t.date DESC
    `).all(user.id) as any[];

    // Fetch debts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const debts = db.prepare(`
      SELECT * FROM debts WHERE user_id = ? ORDER BY due_date ASC
    `).all(user.id) as any[];

    // Fetch budgets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const budgets = db.prepare(`
      SELECT * FROM budgets WHERE user_id = ?
    `).all(user.id) as any[];

    if (format === 'csv') {
      let csv = 'ID,Date,Type,Amount,Category,Description,Payment Method,Notes\n';
      for (const t of transactions) {
        const cat = t.category_en || 'Other';
        const notes = (t.notes || '').replace(/"/g, '""');
        const desc = (t.description || '').replace(/"/g, '""');
        csv += `"${t.id}","${t.date}","${t.type}","${t.amount}","${cat}","${desc}","${t.payment_method || ''}","${notes}"\n`;
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="smart-finance-export-${user.id}.csv"`,
        },
      });
    }

    // JSON export
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        currency: user.currency,
        timezone: user.timezone,
        openingBalance: user.openingBalance,
      },
      exportDate: new Date().toISOString(),
      transactions,
      debts,
      budgets,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="smart-finance-data-${user.id}.json"`,
      },
    });
  } catch (err: unknown) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
