import { buildAlternateLanguages, buildLangUrl } from '@/lib/seo/urls';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

/**
 * Generate standard SEO page metadata including canonical and alternate language links.
 *
 * @param lang Current page language
 * @param routePath Relative path of the page starting with a slash (e.g. "/genres", "/catalog", or "" for homepage)
 * @param title Page title
 * @param description Page description
 * @returns Metadata object for Next.js Page components
 */
export function appendPageParam(path: string, page?: number): string {
  if (!page || page <= 1) return path;
  return `${path}?page=${page}`;
}

export function getPageMetadata(
  lang: SupportedLang,
  routePath: string,
  title: string,
  description: string,
  page?: number
): Metadata {
  const formattedRoutePath = routePath.startsWith('/') ? routePath : `/${routePath}`;
  const path = formattedRoutePath === '/' ? '' : formattedRoutePath;

  const canonicalUrl = buildLangUrl(lang, path, page);
  const alternatesLanguages = buildAlternateLanguages(path, page);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: alternatesLanguages,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
    },
  };
}
