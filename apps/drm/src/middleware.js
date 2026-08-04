import { NextResponse } from 'next/server';
import { verifyEdge, COOKIE } from '@/lib/session-edge';

// Everything is protected except the login page and the login endpoint.
//
// /logo.png is here because the login page shows it before a session exists.
// Without it the request is redirected to /login, the browser receives HTML
// where it expected an image, and the logo renders as a broken-image icon.
// Listed by name rather than by file extension: only what is named here is
// reachable without signing in.
const PUBLIC = ['/login', '/api/auth/login', '/logo.png'];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const session = await verifyEdge(req.cookies.get(COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
