import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
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
export function getPageMetadata(
  lang: SupportedLang,
  routePath: string,
  title: string,
  description: string
): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bibliaris.com';
  const cleanBase = baseUrl.replace(/\/$/, '');

  // Clean routePath to ensure we don't have double slashes
  const formattedRoutePath = routePath.startsWith('/') ? routePath : `/${routePath}`;
  const path = formattedRoutePath === '/' ? '' : formattedRoutePath;

  const canonicalUrl = `${cleanBase}/${lang}${path}`;

  const alternatesLanguages: Record<string, string> = {};
  SUPPORTED_LANGS.forEach((l) => {
    alternatesLanguages[l] = `${cleanBase}/${l}${path}`;
  });
  alternatesLanguages['x-default'] = `${cleanBase}/en${path}`;

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
