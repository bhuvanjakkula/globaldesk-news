import { NextRequest, NextResponse } from 'next/server';
import { allowedOwnerOrigin, OWNER_COOKIE, ownerApi } from '@/lib/owner';
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!allowedOwnerOrigin(origin)) return NextResponse.json({ error: 'Untrusted sign-in origin' }, { status: 403 });
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 4096) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  // Stream bound protects against requests without Content-Length as well.
  const reader = request.body?.getReader(); let size = 0; const chunks: Uint8Array[] = [];
  if (reader) {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return NextResponse.json({ error: 'Request too large' }, { status: 413 }); }
      chunks.push(value);
    }
  }
  const data = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  let token: unknown;
  try { token = JSON.parse(new TextDecoder().decode(data)).token; } catch { return NextResponse.json({ error: 'Invalid sign-in request' }, { status: 400 }); }
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,128}$/.test(token)) return NextResponse.json({ error: 'Invalid sign-in link' }, { status: 400 });
  try {
    const response = await ownerApi('/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin! }, body: JSON.stringify({ token }) });
    if (!response.ok) return NextResponse.json({ error: response.status === 401 ? 'This link expired or was already used. Generate a new owner link.' : 'Sign-in could not be completed.' }, { status: response.status });
    const session = await response.json();
    const result = NextResponse.json({ signed_in: true });
    result.cookies.set(OWNER_COOKIE, session.session_token, {
      httpOnly: true, sameSite: 'strict', secure: origin!.startsWith('https://'), path: '/', maxAge: session.expires_in,
    });
    result.headers.set('Cache-Control', 'private, no-store');
    return result;
  } catch { return NextResponse.json({ error: 'Owner service unavailable. Please retry.' }, { status: 503 }); }
}
