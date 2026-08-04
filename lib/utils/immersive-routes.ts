import { isSupportedLang } from '@/lib/i18n/lang';

/**
 * Immersive routes render a full-viewport UI with their own top/bottom bars
 * (the text reader). The public Header/Footer are omitted there so the page
 * has a single scroll container instead of two.
 */
export function isImmersiveRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;

  const segments = pathname.split('/').filter(Boolean);

  // /:lang/book/:slug/read
  return (
    segments.length === 4 &&
    isSupportedLang(segments[0]) &&
    segments[1] === 'book' &&
    segments[3] === 'read'
  );
}
