import { NextRequest, NextResponse } from 'next/server';
import seedBundle from '@/lib/seed_news.json';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams.toString();
    const apiUrl = `${process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000'}/api/v1/news?${searchParams}`;
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      throw new Error('Backend error');
    }
    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(seedBundle.news, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
