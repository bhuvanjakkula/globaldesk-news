import { NextRequest, NextResponse } from 'next/server';
import { getLiveArticles } from '@/lib/live-news-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const q = searchParams.get('q') || undefined;
    const source = searchParams.get('source') || undefined;
    const country = searchParams.get('country') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const pageSize = searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!, 10) : 24;

    // Check if internal local backend is reachable with low latency
    if (process.env.INTERNAL_API_URL) {
      try {
        const apiUrl = `${process.env.INTERNAL_API_URL}/api/v1/news?${searchParams.toString()}`;
        const res = await fetch(apiUrl, { cache: 'no-store', signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
        }
      } catch {
        // Fall through to real-time universal live engine
      }
    }

    const live = await getLiveArticles({
      category,
      q,
      source,
      country,
      page,
      page_size: pageSize,
    });

    return NextResponse.json(live, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Live-Engine': 'GlobalDesk-Universal-v2',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'News engine fallback', details: String(err) }, { status: 500 });
  }
}
