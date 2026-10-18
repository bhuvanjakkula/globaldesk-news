import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiUrl = `${process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000'}/api/v1/satellite/telemetry`;
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'Telemetry unavailable' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Telemetry connection failed' }, { status: 503 });
  }
}
