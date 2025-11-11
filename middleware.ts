/**
 * Middleware for route protection
 *
 * Checks authorization and user roles for admin panel access.
 * All routes under /admin/* require authorization and admin or content_manager role.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { STAFF_ROLES } from '@/lib/auth/constants';
import { ADMIN_LANG_REGEX, DEFAULT_REDIRECT_LANG } from '@/lib/middleware.constants';

/**
 * Check if path is admin route
 */
const isAdminRoute = (pathname: string): boolean => {
  return pathname.startsWith('/admin');
};

/**
 * Extract language from admin path
 *
 * @param pathname - URL path
 * @returns language from path or default language
 */
const extractLangFromAdminPath = (pathname: string): string => {
  const match = pathname.match(ADMIN_LANG_REGEX);
  return match ? match[1] : DEFAULT_REDIRECT_LANG;
};

/**
 * Middleware function
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Check only admin routes
  if (!isAdminRoute(pathname)) {
    return NextResponse.next();
  }

  // Get session from request (NextAuth adds it automatically)
  const session = req.auth;

  // If no session - redirect to login
  if (!session || !session.user) {
    const lang = extractLangFromAdminPath(pathname);
    const signInUrl = new URL(`/${lang}/auth/sign-in`, req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check for staff role (admin or content_manager)
  const userRoles = session.user.roles || [];
  const hasStaffRole = STAFF_ROLES.some((role) => userRoles.includes(role));

  // If no required role - show 403
  if (!hasStaffRole) {
    const lang = extractLangFromAdminPath(pathname);
    return NextResponse.redirect(new URL(`/${lang}/403`, req.url));
  }

  // All OK - pass the request
  return NextResponse.next();
});

/**
 * Matcher configuration - which paths the middleware applies to
 */
export const config = {
  // Apply only to admin routes
  // Exclude static files, API routes and Next.js resources
  matcher: ['/admin/:lang*/:path*', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
