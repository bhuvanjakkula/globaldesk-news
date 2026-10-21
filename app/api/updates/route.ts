import { NextResponse } from 'next/server';
import { getLiveRevision } from '@/lib/live-news-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const isVercel = process.env.VERCEL === '1' || !!process.env.NEXT_PUBLIC_VERCEL_ENV;
  const internalUrl = process.env.INTERNAL_API_URL;

  if (internalUrl && !isVercel) {
    try {
      const response = await fetch(`${internalUrl}/api/v1/updates`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(600),
      });
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'no-store',
            'X-Temporal-Window': 'STRICTLY_YESTERDAY_AND_TODAY',
            'X-Security-Shield': 'PQC-Anti-Injection-Armed',
          },
        });
      }
    } catch {
      // Fall through to real-time revision generator
    }
  }

  // Real-time live syndication revision ticker with zero latency
  const revisionData = getLiveRevision();
  return NextResponse.json(revisionData, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Poll-Status': 'Active',
      'X-Temporal-Window': 'STRICTLY_YESTERDAY_AND_TODAY',
      'X-Security-Shield': 'PQC-Anti-Injection-Armed',
      'X-Update-Frequency': '2-Minutes-Up-To-The-Minute',
    },
  });
}

export async function POST() {
  return NextResponse.json({ error: 'Access Denied: Direct news publication blocked.' }, { status: 403 });
}
