import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { allowedOwnerOrigin, OWNER_COOKIE, ownerApi } from '@/lib/owner';
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!allowedOwnerOrigin(origin)) return NextResponse.json({ error: 'Untrusted origin' }, { status: 403 });
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  try {
    if (token) {
      const upstream = await ownerApi('/logout', { method: 'POST', headers: { Origin: origin!, Authorization: `Bearer ${token}` } });
      if (!upstream.ok && upstream.status !== 401) return NextResponse.json({ error: 'Session revocation failed. Please retry.' }, { status: 503 });
    }
    const result = NextResponse.redirect(new URL('/owner', origin!), 303);
    result.cookies.set(OWNER_COOKIE, '', { maxAge: 0, httpOnly: true, sameSite: 'strict', secure: origin!.startsWith('https://'), path: '/' });
    return result;
  } catch { return NextResponse.json({ error: 'Session revocation failed. Please retry.' }, { status: 503 }); }
}
