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
          return NextResponse.json(data, {
            headers: {
              'Cache-Control': 'no-store',
              'X-Temporal-Window': 'STRICTLY_YESTERDAY_AND_TODAY',
              'X-Security-Shield': 'PQC-Anti-Injection-Armed',
            },
          });
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
        'X-Live-Engine': 'GlobalDesk-Universal-v3-TemporalGuard',
        'X-Temporal-Window': 'STRICTLY_YESTERDAY_AND_TODAY',
        'X-Security-Shield': 'PQC-Anti-Injection-Armed',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'News engine fallback', details: String(err) }, { status: 500 });
  }
}

/**
 * Anti-Illegal-Push Defense:
 * Explicitly rejects and blocks any unauthorized attempt to push or inject news articles.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  console.warn(`[SECURITY ALERT] Illegal push attempt intercepted and blocked from IP: ${ip}`);
  return NextResponse.json(
    {
      error: 'Access Denied: Direct news publication is strictly prohibited.',
      security_event: 'ILLEGAL_PUSH_ATTEMPT_INTERCEPTED',
      status: 'BLOCKED',
      timestamp: new Date().toISOString(),
    },
    {
      status: 403,
      headers: {
        'X-Security-Shield': 'PQC-Anti-Injection-Armed',
        'X-Tamper-Prevention': 'ACTIVE',
      },
    }
  );
}

export async function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
