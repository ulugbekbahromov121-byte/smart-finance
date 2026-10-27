import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { parseNaturalLanguageTransaction } from '@/lib/nlp';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text string is required' }, { status: 400 });
    }

    const timezone = user?.timezone || 'Asia/Tashkent';
    const parsed = parseNaturalLanguageTransaction(text, timezone);

    return NextResponse.json({
      success: true,
      parsed,
    });
  } catch (err: unknown) {
    console.error('NLP parse error:', err);
    return NextResponse.json({ error: 'Failed to parse transaction text' }, { status: 500 });
  }
}
