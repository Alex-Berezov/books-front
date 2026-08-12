/**
 * Middleware for route protection
 *
 * Checks authorization and user roles for admin panel access.
 * All routes under /admin/* require authorization and admin or content_manager role.
 */

import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { ADMIN_PANEL_ROLES } from '@/lib/auth/constants';
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
/**
 * Личные маршруты — только `/{lang}/read|listen|summary`.
 *
 * 🔴 **Шаблон обязан быть заякорен на позицию сегмента.** Прежний
 * `/\/(?:read|listen|summary)\//` искал эти слова **где угодно** в пути, и
 * `/en/category/read/` попадал под авторизацию: публичная страница термина со
 * слагом `read` закрылась бы для анонима. Пока контентные маршруты не проходили
 * через middleware (`LEGACY-083`), это не проявлялось — расширение matcher
 * делает такой шаблон опасным немедленно.
 *
 * `(?:\/|$)` вместо завершающего слэша: `/en/read` без хвоста — тоже личный
 * маршрут, и пускать на него анонима нельзя.
 *
 * Флаг `i` — потому что теперь сюда доходит и `/EN/Read/...`. Нормализация
 * регистра стоит раньше гейта и всё равно отправила бы такой адрес в 301,
 * но предикат безопасности не должен зависеть от порядка шагов выше.
 */
// Экспортируется ради посадки: тест обязан проверять **этот** предикат, а не
// свою копию шаблона рядом (`LEGACY-083`). Next.js трактует специально только
// `middleware` и `config`, остальные экспорты ему безразличны.
export const isPrivateRoute = (pathname: string): boolean =>
  /^\/[a-z]{2}\/(?:read|listen|summary)(?:\/|$)/i.test(pathname);

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
    const authCookies = request.cookies
      .getAll()
      .map((c) => c.name)
      .filter((n) => n.includes('auth') || n.includes('next') || n.includes('session'));
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

    // Check for an admin-panel role (admin, content_manager or lawyer).
    // A lawyer is let in but sees only the legal sections — the sidebar filters by role.
    const userRoles = (token.roles as string[]) || [];
    const hasAdminPanelRole = ADMIN_PANEL_ROLES.some((role) => userRoles.includes(role));

    // If no required role - show 403
    if (!hasAdminPanelRole) {
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
  /**
   * 🔴 **Один широкий шаблон, а не список маршрутов — и это не стиль, а
   * необходимость.** Next компилирует `matcher` в регистро**зависимую**
   * регулярку (`new RegExp(matcher.regexp)` без флага `i`), поэтому
   * перечисление вида `/:lang(ru|en|es|fr|pt)/book/:path*` не ловит
   * `/en/Book/Slug` — ровно тот адрес, ради нормализации которого запись
   * `LEGACY-083` и заведена. Проверено на установленной версии Next:
   * `/en/book/hamlet` совпадает, `/en/Book/Hamlet` и `/EN/book/hamlet` — нет.
   *
   * Перечисление вдобавок промахивалось мимо хабов таксономий
   * (`/en/categories`, `/en/genres`, `/en/collections`, `/en/tags`) и мимо
   * catch-all CMS-страниц, хотя их адреса карта сайта публикует.
   *
   * Исключения — статика и API: у первых есть расширение, вторые обслуживаются
   * не страницами. Остальное отбирают предикаты в коде: `isPagePath`
   * нормализует, `isAdminRoute` и `isPrivateRoute` гейтят.
   *
   * ⚠️ Побочный эффект: список языков больше нигде в этом файле не дублируется,
   * так что добавление языка в `SUPPORTED_LANGS` не оставляет здесь протухших
   * строк.
   */
  matcher: ['/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)'],
};
