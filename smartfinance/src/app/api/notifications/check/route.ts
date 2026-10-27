import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { runUserFinancialChecks } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newNotificationsCount } = runUserFinancialChecks(user.id);

    return NextResponse.json({
      success: true,
      newNotificationsCount,
    });
  } catch (err: unknown) {
    console.error('Notifications check error:', err);
    return NextResponse.json({ error: 'Failed to run notifications check' }, { status: 500 });
  }
}
