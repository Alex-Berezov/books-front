import { isSupportedLang } from '@/lib/i18n/lang';

/** Path segments without empty ones, so a trailing slash does not change the match. */
const pathSegments = (pathname: string): string[] => pathname.split('/').filter(Boolean);

/**
 * Immersive routes render a full-viewport UI with their own top/bottom bars
 * (the text reader). The public Header/Footer are omitted there so the page
 * has a single scroll container instead of two.
 */
export function isImmersiveRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;

  const segments = pathSegments(pathname);

  // /:lang/book/:slug/read
  return (
    segments.length === 4 &&
    isSupportedLang(segments[0]) &&
    segments[1] === 'book' &&
    segments[3] === 'read'
  );
}

/**
 * The admin's own immersive route: the draft preview of a book version's text
 * (`/admin/:lang/books/versions/:id/preview`). It shows the public reader's view,
 * which owns the whole viewport, so the admin sidebar and top bar are not
 * rendered there at all - hiding them under a layer would leave their links in
 * the tab order.
 */
export function isAdminImmersiveRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;

  const segments = pathSegments(pathname);

  return (
    segments.length === 6 &&
    segments[0] === 'admin' &&
    isSupportedLang(segments[1]) &&
    segments[2] === 'books' &&
    segments[3] === 'versions' &&
    segments[5] === 'preview'
  );
}
