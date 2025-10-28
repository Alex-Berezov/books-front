/**
 * Middleware для защиты роутов
 *
 * Проверяет авторизацию и роли пользователей для доступа к админке.
 * Все роуты под /admin/* требуют авторизации и роли admin или content_manager.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { STAFF_ROLES } from '@/lib/auth/constants';
import { ADMIN_LANG_REGEX, DEFAULT_REDIRECT_LANG } from '@/lib/middleware.constants';

/**
 * Проверка, является ли путь админским
 */
const isAdminRoute = (pathname: string): boolean => {
  return pathname.startsWith('/admin');
};

/**
 * Извлечение языка из пути админки
 *
 * @param pathname - путь URL
 * @returns язык из пути или язык по умолчанию
 */
const extractLangFromAdminPath = (pathname: string): string => {
  const match = pathname.match(ADMIN_LANG_REGEX);
  return match ? match[1] : DEFAULT_REDIRECT_LANG;
};

/**
 * Middleware функция
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Проверяем только админские роуты
  if (!isAdminRoute(pathname)) {
    return NextResponse.next();
  }

  // Получаем сессию из request (NextAuth добавляет её автоматически)
  const session = req.auth;

  // Если нет сессии - редирект на логин
  if (!session || !session.user) {
    const lang = extractLangFromAdminPath(pathname);
    const signInUrl = new URL(`/${lang}/auth/sign-in`, req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Проверяем наличие staff роли (admin или content_manager)
  const userRoles = session.user.roles || [];
  const hasStaffRole = STAFF_ROLES.some((role) => userRoles.includes(role));

  // Если нет нужной роли - показываем 403
  if (!hasStaffRole) {
    const lang = extractLangFromAdminPath(pathname);
    return NextResponse.redirect(new URL(`/${lang}/403`, req.url));
  }

  // Всё ОК - пропускаем запрос
  return NextResponse.next();
});

/**
 * Конфигурация matcher - на какие пути применяется middleware
 */
export const config = {
  // Применяем только к админским роутам
  // Исключаем статические файлы, API роуты и ресурсы Next.js
  matcher: ['/admin/:lang*/:path*', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
