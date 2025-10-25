/**
 * Утилиты для работы с языковыми заголовками в HTTP запросах
 *
 * Предоставляет функции для добавления Accept-Language заголовка
 * и извлечения языка из различных источников.
 */

import type { SupportedLang } from '@/lib/i18n/lang';
import { isSupportedLang, getDefaultLang } from '@/lib/i18n/lang';

/**
 * Добавить языковой заголовок к существующим заголовкам
 *
 * @param lang - Код языка
 * @param headers - Существующие заголовки (опционально)
 * @returns Заголовки с добавленным Accept-Language
 *
 * @example
 * ```ts
 * const headers = withLangHeaders('en', {
 *   'Content-Type': 'application/json'
 * });
 * // { 'Content-Type': 'application/json', 'Accept-Language': 'en' }
 * ```
 */
export const withLangHeaders = (lang: SupportedLang, headers?: HeadersInit): HeadersInit => {
  const baseHeaders: Record<string, string> = {};

  // Копируем существующие заголовки
  if (headers) {
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        baseHeaders[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        baseHeaders[key] = value;
      });
    } else {
      Object.assign(baseHeaders, headers);
    }
  }

  // Добавляем Accept-Language
  baseHeaders['Accept-Language'] = lang;

  return baseHeaders;
};

/**
 * Извлечь язык из pathname URL
 *
 * @param pathname - Путь URL (например, '/en/books/some-slug')
 * @returns Код языка или дефолтный язык
 *
 * @example
 * ```ts
 * extractLangFromPath('/en/books/slug'); // 'en'
 * extractLangFromPath('/admin/fr/pages'); // 'fr'
 * extractLangFromPath('/invalid/path'); // 'en' (default)
 * ```
 */
export const extractLangFromPath = (pathname: string): SupportedLang => {
  const segments = pathname.split('/').filter(Boolean);

  // Проверяем первый сегмент для публичных маршрутов
  if (segments.length >= 1 && isSupportedLang(segments[0])) {
    return segments[0];
  }

  // Проверяем второй сегмент для admin маршрутов
  if (segments[0] === 'admin' && segments.length >= 2 && isSupportedLang(segments[1])) {
    return segments[1];
  }

  // Возвращаем дефолтный язык если не нашли
  return getDefaultLang();
};

/**
 * Получить текущий язык на клиенте из URL
 *
 * @returns Код текущего языка
 *
 * @example
 * ```ts
 * // Если текущий URL: https://example.com/en/books
 * const lang = getCurrentLang(); // 'en'
 * ```
 */
export const getCurrentLang = (): SupportedLang => {
  if (typeof window === 'undefined') {
    return getDefaultLang();
  }

  return extractLangFromPath(window.location.pathname);
};

/**
 * Создать заголовки для HTTP запроса с текущим языком
 *
 * @param headers - Дополнительные заголовки (опционально)
 * @returns Заголовки с Accept-Language для текущего языка
 *
 * @example
 * ```ts
 * const headers = createLangHeaders({
 *   'Authorization': 'Bearer token'
 * });
 * ```
 */
export const createLangHeaders = (headers?: HeadersInit): HeadersInit => {
  const currentLang = getCurrentLang();
  return withLangHeaders(currentLang, headers);
};

/**
 * Проверить, требуется ли языковой префикс для эндпоинта
 *
 * Некоторые эндпоинты (например, /auth/*) не требуют языкового префикса
 *
 * @param endpoint - Путь эндпоинта
 * @returns true если требуется языковой префикс
 *
 * @example
 * ```ts
 * needsLangPrefix('/books/slug'); // true
 * needsLangPrefix('/auth/login'); // false
 * needsLangPrefix('/users/me'); // false
 * ```
 */
export const needsLangPrefix = (endpoint: string): boolean => {
  const neutralPrefixes = ['/auth/', '/users/', '/api/'];

  return !neutralPrefixes.some((prefix) => endpoint.startsWith(prefix));
};

/**
 * Построить URL с языковым префиксом если необходимо
 *
 * @param lang - Код языка
 * @param endpoint - Путь эндпоинта
 * @returns URL с языковым префиксом или без него
 *
 * @example
 * ```ts
 * buildLangUrl('en', '/books/slug'); // '/en/books/slug'
 * buildLangUrl('en', '/auth/login'); // '/auth/login'
 * ```
 */
export const buildLangUrl = (lang: SupportedLang, endpoint: string): string => {
  if (!needsLangPrefix(endpoint)) {
    return endpoint;
  }

  // Убираем начальный слэш если есть
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  return `/${lang}/${normalizedEndpoint}`;
};
