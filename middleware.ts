/**
 * Middleware for route protection
 *
 * Checks authorization and user roles for admin panel access.
 * All routes under /admin/* require authorization and admin or content_manager role.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { STAFF_ROLES } from '@/lib/auth/constants';
import { DEFAULT_REDIRECT_LANG } from '@/lib/middleware.constants';

/**
 * Check if path is admin route
 */
const isAdminRoute = (pathname: string): boolean => {
  return pathname.startsWith('/admin');
};

/**
 * Check if path is private reader or player route
 */
const isPrivateRoute = (pathname: string): boolean => {
  // Matches /[lang]/read/... or /[lang]/listen/...
  return /\/(?:read|listen)\//.test(pathname);
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
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || 'https';

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
      finalProto = req.nextUrl.protocol.replace(':', '');
    }
    const redirectUrl = `${finalProto}://${targetHost}${targetPathname}${search}`;
    const currentUrl = `${req.nextUrl.protocol.replace(':', '')}://${host}${pathname}${search}`;

    if (redirectUrl !== currentUrl) {
      return NextResponse.redirect(new URL(redirectUrl), 301);
    }
  }

  // Protect private routes (read/listen)
  if (isPrivateRoute(pathname)) {
    const session = req.auth;
    if (!session || !session.user) {
      const lang = extractLangFromPath(pathname);
      const signInUrl = new URL(`/${lang}/auth/sign-in`, req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Check only admin routes
  if (!isAdminRoute(pathname)) {
    return NextResponse.next();
  }

  // Get session from request (NextAuth adds it automatically)
  const session = req.auth;

  // If no session - redirect to login
  if (!session || !session.user) {
    const lang = extractLangFromPath(pathname);
    const signInUrl = new URL(`/${lang}/auth/sign-in`, req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check for staff role (admin or content_manager)
  const userRoles = session.user.roles || [];
  const hasStaffRole = STAFF_ROLES.some((role) => userRoles.includes(role));

  // If no required role - show 403
  if (!hasStaffRole) {
    const lang = extractLangFromPath(pathname);
    return NextResponse.redirect(new URL(`/${lang}/403`, req.url));
  }

  // All OK - pass the request
  return NextResponse.next();
});

/**
 * Matcher configuration - which paths the middleware applies to
 */
export const config = {
  matcher: [
    '/admin/:lang*/:path*',
    '/:lang(ru|en|es|fr|pt)/profile/:path*',
    '/:lang(ru|en|es|fr|pt)/bookshelf/:path*',
    '/:lang(ru|en|es|fr|pt)/read/:path*',
    '/:lang(ru|en|es|fr|pt)/listen/:path*',
  ],
};
