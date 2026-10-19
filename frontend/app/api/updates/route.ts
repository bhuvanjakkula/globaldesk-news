import { NextResponse } from 'next/server';
import { getLiveRevision } from '@/lib/live-news-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.INTERNAL_API_URL) {
    try {
      const response = await fetch(`${process.env.INTERNAL_API_URL}/api/v1/updates`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        return NextResponse.json(await response.json(), {
          headers: { 'Cache-Control': 'no-store' },
        });
      }
    } catch {
      // Fall through to real-time revision generator
    }
  }

  // Real-time live syndication revision ticker
  const revisionData = getLiveRevision();
  return NextResponse.json(revisionData, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Poll-Status': 'Active',
    },
  });
}
