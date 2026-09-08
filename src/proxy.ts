import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Route-level gate only: this NEVER decides tenant membership by itself.
// It just requires a session before entering /w/*; the real tenant check
// (does this user actually belong to this org?) happens server-side in
// resolveTenant() for every request — see src/lib/tenant.ts.
export default auth((req) => {
  const isAppRoute = req.nextUrl.pathname.startsWith('/w/');
  const isLoggedIn = !!req.auth;

  if (isAppRoute && !isLoggedIn) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/w/:path*'],
};
