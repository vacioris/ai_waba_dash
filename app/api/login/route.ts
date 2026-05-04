import { NextRequest, NextResponse } from 'next/server';
import { makeAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: 'Server misconfigured: DASHBOARD_PASSWORD not set' }, { status: 500 });
  }

  if (password !== expected) {
    // Deliberate small delay to slow brute-force
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const token = makeAuthToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE_NAME);
  return res;
}
