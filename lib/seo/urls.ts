import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Single source of truth for PUBLIC page URLs (canonical, hreflang, og:url,
 * JSON-LD, sitemap). Direct string concatenation with a host is forbidden
 * elsewhere — see tasks/tz-seo-subdomain-leak.md.
 *
 * `NEXT_PUBLIC_API_BASE_URL` is for data fetching only and must never reach
 * this module. Service subdomains that arrive from the backend SEO payload are
 * rewritten to the public origin by `toPublicUrl`.
 */

/** Used when NEXT_PUBLIC_SITE_URL is unset — always a public page host. */
const DEFAULT_SITE_URL = 'https://bibliaris.com';

/** Host prefixes that can never serve public HTML pages. */
const SERVICE_HOST_PREFIXES = ['api.', 'media.', 'cdn.', 'static.', 'assets.'];

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

export function isServiceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return SERVICE_HOST_PREFIXES.some((prefix) => host.startsWith(prefix));
}

/** Asset paths on service hosts are legitimate (covers, audio) and must stay untouched. */
const ASSET_PATH_PREFIXES = ['/static/', '/uploads/', '/covers/', '/media/'];
const ASSET_EXTENSION = /\.(?:jpe?g|png|webp|avif|gif|svg|ico|mp3|m4a|ogg|wav|pdf|epub|xml|json)$/i;

function isAssetPath(pathname: string): boolean {
  return (
    ASSET_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    ASSET_EXTENSION.test(pathname)
  );
}

/**
 * Rewrite a URL served by a service subdomain onto the public origin.
 *
 * Defence in depth: the backend `/seo/resolve` payload used to carry
 * `https://api.bibliaris.com/...` in canonical/hreflang/og:url/JSON-LD, and
 * Google indexed those 404s. The backend is fixed, but the frontend must not
 * republish whatever host the API happens to send.
 *
 * Asset URLs (covers, audio) on `media.`/`api./static` are returned unchanged —
 * those files really do live there.
 */
export function toPublicUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(url, getSiteUrl());
  } catch {
    return undefined;
  }

  if (!isServiceHost(parsed.hostname) || isAssetPath(parsed.pathname)) return parsed.toString();

  const site = new URL(getSiteUrl());
  parsed.protocol = site.protocol;
  parsed.host = site.host;
  return parsed.toString();
}

/** Build a public URL from a site-relative path (`/en/tag/fear`). */
export function buildPublicUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${cleanPath}`;
}

/** Build a language-prefixed public URL. `routePath` is the part after `/:lang`. */
export function buildLangUrl(lang: string, routePath = '', page?: number): string {
  const normalized = routePath === '/' ? '' : routePath;
  const withSlash = !normalized || normalized.startsWith('/') ? normalized : `/${normalized}`;
  const suffix = page && page > 1 ? `?page=${page}` : '';
  return buildPublicUrl(`/${lang}${withSlash}${suffix}`);
}

/** hreflang map for every supported language plus x-default (English). */
export function buildAlternateLanguages(routePath = '', page?: number): Record<string, string> {
  const languages: Record<string, string> = {};
  SUPPORTED_LANGS.forEach((lang) => {
    languages[lang] = buildLangUrl(lang, routePath, page);
  });
  languages['x-default'] = buildLangUrl('en', routePath, page);
  return languages;
}

/** Sanitize an hreflang map coming from the backend SEO payload. */
export function toPublicAlternates(
  links: Array<{ hreflang?: string | null; href?: string | null }> | null | undefined
): Record<string, string> {
  const languages: Record<string, string> = {};
  links?.forEach((link) => {
    if (!link?.hreflang) return;
    const href = toPublicUrl(link.href);
    if (href) languages[link.hreflang] = href;
  });
  return languages;
}

/**
 * Deep-rewrite every service-host URL inside a backend JSON-LD graph.
 * Keeps the structure intact and only touches string values that parse as URLs.
 */
export function toPublicJsonLd<T>(value: T): T {
  if (typeof value === 'string') {
    if (!/^https?:\/\//i.test(value)) return value;
    return (toPublicUrl(value) ?? value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toPublicJsonLd(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      result[key] = toPublicJsonLd(item);
    });
    return result as unknown as T;
  }
  return value;
}

export type { SupportedLang };
