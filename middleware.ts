import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'tnzf_auth';

async function verify(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);

  // Web Crypto HMAC-SHA256 (Edge Runtime compatible)
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expected !== sig) return false;
  const [marker, expiryStr] = payload.split(':');
  if (marker !== 'valid') return false;
  const expiry = parseInt(expiryStr, 10);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname === '/login' ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET || 'fallback-change-me';
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!(await verify(token, secret))) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
