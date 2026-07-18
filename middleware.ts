/**
 * Middleware for route protection
 *
 * Checks authorization and user roles for admin panel access.
 * All routes under /admin/* require authorization and admin or content_manager role.
 */

import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { STAFF_ROLES } from '@/lib/auth/constants';
import { DEFAULT_REDIRECT_LANG } from '@/lib/middleware.constants';
import type { NextRequest } from 'next/server';

/**
 * Check if path is admin route
 */
const isAdminRoute = (pathname: string): boolean => {
  return pathname.startsWith('/admin');
};

/**
 * Check if path is private reader, player, or summary route
 */
const isPrivateRoute = (pathname: string): boolean => {
  // Matches /[lang]/read/... or /[lang]/listen/... or /[lang]/summary/...
  return /\/(?:read|listen|summary)\//.test(pathname);
};

/**
 * Extract language from path (handles admin and public paths)
 */
const extractLangFromPath = (pathname: string): string => {
  const match = pathname.match(/^\/(?:admin\/)?([a-z]{2})/);
  return match ? match[1] : DEFAULT_REDIRECT_LANG;
};

/**
 * Check if path is a page route (not static asset, api, etc.)
 */
const isPagePath = (pathname: string): boolean => {
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return false;
  }
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return false;
  }
  return true;
};

/**
 * Middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get('host') || request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') || 'https';

  // Instant redirect for root path '/' to default language
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${DEFAULT_REDIRECT_LANG}`, request.url));
  }

  let shouldRedirect = false;
  let targetHost = host;
  let targetProto = proto;
  let targetPathname = pathname;

  // 1. http -> https (excluding localhost)
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  if (proto === 'http' && !isLocalhost) {
    targetProto = 'https';
    shouldRedirect = true;
  }

  // 2. www -> non-www
  if (host.startsWith('www.')) {
    targetHost = host.slice(4);
    shouldRedirect = true;
  }

  // 3. uppercase -> lowercase path
  if (isPagePath(pathname) && /[A-Z]/.test(pathname)) {
    targetPathname = pathname.toLowerCase();
    shouldRedirect = true;
  }

  if (shouldRedirect) {
    let finalProto = targetProto;
    if (isLocalhost) {
      finalProto = request.nextUrl.protocol.replace(':', '');
    }
    const redirectUrl = `${finalProto}://${targetHost}${targetPathname}${search}`;
    const currentUrl = `${request.nextUrl.protocol.replace(':', '')}://${host}${pathname}${search}`;

    if (redirectUrl !== currentUrl) {
      return NextResponse.redirect(new URL(redirectUrl), 301);
    }
  }

  // For non-admin and non-private routes, skip auth checks
  if (!isAdminRoute(pathname) && !isPrivateRoute(pathname)) {
    return NextResponse.next();
  }

  // Get session token for protected routes
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: !isLocalhost,
  });

  // DIAGNOSTIC: temporary logging for admin auth debug
  if (isAdminRoute(pathname)) {
    const authCookies = request.cookies.getAll().map(c => c.name).filter(n => n.includes('auth') || n.includes('next') || n.includes('session'));
    const t = token as Record<string, unknown> | null;
    console.log('[AUTH] path:', pathname);
    console.log('[AUTH] token:', !!t);
    console.log('[AUTH] cookies:', JSON.stringify(authCookies));
    if (t) {
      console.log('[AUTH] keys:', Object.keys(t));
      console.log('[AUTH] email:', t.email);
      console.log('[AUTH] roles:', JSON.stringify(t.roles));
      console.log('[AUTH] role:', t.role);
      console.log('[AUTH] user:', JSON.stringify(t.user));
    }
  }

  // Protect private routes (read/listen/summary)
  if (isPrivateRoute(pathname)) {
    if (!token) {
      const lang = extractLangFromPath(pathname);
      const signInUrl = new URL(`/${lang}/auth/sign-in`, request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Check admin routes
  if (isAdminRoute(pathname)) {
    // If no session - redirect to login
    if (!token) {
      const lang = extractLangFromPath(pathname);
      const signInUrl = new URL(`/${lang}/auth/sign-in`, request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Check for staff role (admin or content_manager)
    const userRoles = (token.roles as string[]) || [];
    const hasStaffRole = STAFF_ROLES.some((role) => userRoles.includes(role));

    // If no required role - show 403
    if (!hasStaffRole) {
      const lang = extractLangFromPath(pathname);
      return NextResponse.redirect(new URL(`/${lang}/403`, request.url));
    }
  }

  // All OK - pass the request
  return NextResponse.next();
}

/**
 * Matcher configuration - which paths the middleware applies to
 */
export const config = {
  matcher: [
    '/',
    '/admin/:lang*/:path*',
    '/:lang(ru|en|es|fr|pt)/profile/:path*',
    '/:lang(ru|en|es|fr|pt)/bookshelf/:path*',
    '/:lang(ru|en|es|fr|pt)/read/:path*',
    '/:lang(ru|en|es|fr|pt)/listen/:path*',
    '/:lang(ru|en|es|fr|pt)/summary/:path*',
  ],
};
