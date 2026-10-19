import { NextRequest, NextResponse } from 'next/server';
import { getLiveBroadcastBulletin } from '@/lib/live-news-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get('channel') || 'live';
  const id = request.nextUrl.searchParams.get('id');

  if (process.env.INTERNAL_API_URL) {
    const params = new URLSearchParams({ channel });
    if (id) params.set('identifier', id);
    try {
      const r = await fetch(
        `${process.env.INTERNAL_API_URL}/api/v1/broadcast${id ? '/check' : ''}?${params}`,
        { cache: 'no-store', signal: AbortSignal.timeout(1000) }
      );
      if (r.ok) {
        return NextResponse.json(await r.json(), { headers: { 'Cache-Control': 'no-store' } });
      }
    } catch {
      // Fall through to live broadcast engine
    }
  }

  try {
    const bulletin = await getLiveBroadcastBulletin(channel);

    if (id) {
      const match = bulletin.items.find((item) => item.id === id);
      if (match) {
        return NextResponse.json(match, { headers: { 'Cache-Control': 'no-store' } });
      }
    }

    return NextResponse.json(bulletin, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Broadcast-Engine': 'GlobalDesk-Studio-v2',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Broadcast engine fallback', details: String(err) }, { status: 500 });
  }
}
