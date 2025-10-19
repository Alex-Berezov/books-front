export const SUPPORTED_LANGS = ['en', 'es', 'fr', 'pt'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const LANGUAGE_LABELS: Record<SupportedLang, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
};

export const LANGUAGE_FLAGS: Record<SupportedLang, string> = {
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  pt: '🇵🇹',
};

export const isSupportedLang = (lang: string): lang is SupportedLang => {
  return SUPPORTED_LANGS.includes(lang as SupportedLang);
};

export const getDefaultLang = (): SupportedLang => {
  return (process.env.NEXT_PUBLIC_DEFAULT_LANG as SupportedLang) || 'en';
};

/**
 * Switch language in a given path
 * Handles both public (/:lang) and admin (/admin/:lang) routes
 *
 * @param currentPath - Current pathname (e.g., '/en/books/some-book' or '/admin/en/pages')
 * @param newLang - Target language code
 * @returns New path with the language switched
 *
 * @example
 * switchLangInPath('/en/books/some-book', 'es') // => '/es/books/some-book'
 * switchLangInPath('/admin/en/pages', 'fr') // => '/admin/fr/pages'
 * switchLangInPath('/admin/en', 'pt') // => '/admin/pt'
 */
export const switchLangInPath = (currentPath: string, newLang: SupportedLang): string => {
  // Remove leading slash for easier processing
  const pathWithoutLeadingSlash = currentPath.startsWith('/') ? currentPath.slice(1) : currentPath;
  const segments = pathWithoutLeadingSlash.split('/');

  // Check if this is an admin route
  const isAdminRoute = segments[0] === 'admin';

  if (isAdminRoute) {
    // Admin route: /admin/:lang/...
    if (segments.length >= 2 && isSupportedLang(segments[1])) {
      // Replace the language at position 1
      segments[1] = newLang;
    } else {
      // No language found, insert it after 'admin'
      segments.splice(1, 0, newLang);
    }
  } else {
    // Public route: /:lang/...
    if (segments.length >= 1 && isSupportedLang(segments[0])) {
      // Replace the language at position 0
      segments[0] = newLang;
    } else {
      // No language found, prepend it
      segments.unshift(newLang);
    }
  }

  return '/' + segments.join('/');
};

/**
 * Extract language from pathname
 * @param pathname - Current pathname
 * @returns Language code or default language
 */
export const getLangFromPath = (pathname: string): SupportedLang => {
  const segments = pathname.split('/').filter(Boolean);

  // Check if admin route
  if (segments[0] === 'admin' && segments.length >= 2 && isSupportedLang(segments[1])) {
    return segments[1];
  }

  // Check if public route
  if (segments.length >= 1 && isSupportedLang(segments[0])) {
    return segments[0];
  }

  return getDefaultLang();
};
