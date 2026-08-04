import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildAlternateLanguages,
  buildLangUrl,
  buildPublicUrl,
  getSiteUrl,
  isServiceHost,
  toPublicAlternates,
  toPublicJsonLd,
  toPublicUrl,
} from '@/lib/seo/urls';
import { buildSitemapIndexXml, buildUrlSetXml } from '@/lib/sitemap/utils';
import { getPageMetadata } from '@/lib/utils/seo';

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

/** Service subdomains must never appear in canonical / hreflang / og:url / JSON-LD / sitemap. */
const FORBIDDEN_HOST = /(api|media|cdn|static|assets)\.bibliaris\.com/;

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_SITE_URL = 'https://bibliaris.com';
});

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
});

describe('getSiteUrl', () => {
  it('strips a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bibliaris.com/';
    expect(getSiteUrl()).toBe('https://bibliaris.com');
  });

  it('falls back to the public domain when unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe('https://bibliaris.com');
  });
});

describe('isServiceHost', () => {
  it.each(['api.bibliaris.com', 'media.bibliaris.com', 'CDN.bibliaris.com'])('flags %s', (host) => {
    expect(isServiceHost(host)).toBe(true);
  });

  it('does not flag the public host', () => {
    expect(isServiceHost('bibliaris.com')).toBe(false);
  });
});

describe('toPublicUrl', () => {
  it('rewrites an api-host page URL onto the public origin', () => {
    expect(toPublicUrl('https://api.bibliaris.com/en/tag/fear')).toBe(
      'https://bibliaris.com/en/tag/fear'
    );
  });

  it('preserves query and hash', () => {
    expect(toPublicUrl('https://api.bibliaris.com/en/catalog?page=2#top')).toBe(
      'https://bibliaris.com/en/catalog?page=2#top'
    );
  });

  it('leaves a public URL untouched', () => {
    expect(toPublicUrl('https://bibliaris.com/fr/genre/drame')).toBe(
      'https://bibliaris.com/fr/genre/drame'
    );
  });

  it('leaves media asset URLs untouched (Google Images traffic)', () => {
    const cover = 'https://media.bibliaris.com/covers/2026/07/08/a7ddaf6e.png';
    expect(toPublicUrl(cover)).toBe(cover);
  });

  it('leaves api-served static files untouched', () => {
    const file = 'https://api.bibliaris.com/static/covers/x.webp';
    expect(toPublicUrl(file)).toBe(file);
  });

  it('returns undefined for empty input', () => {
    expect(toPublicUrl(undefined)).toBeUndefined();
    expect(toPublicUrl(null)).toBeUndefined();
    expect(toPublicUrl('')).toBeUndefined();
  });
});

describe('toPublicAlternates', () => {
  it('rewrites every hreflang href and drops entries without a language', () => {
    const alternates = toPublicAlternates([
      { hreflang: 'en', href: 'https://api.bibliaris.com/en/tag/fear' },
      { hreflang: 'ru', href: 'https://api.bibliaris.com/ru/tag/strah' },
      { hreflang: null, href: 'https://api.bibliaris.com/es/tag/miedo' },
    ]);

    expect(alternates).toEqual({
      en: 'https://bibliaris.com/en/tag/fear',
      ru: 'https://bibliaris.com/ru/tag/strah',
    });
    Object.values(alternates).forEach((href) => expect(href).not.toMatch(FORBIDDEN_HOST));
  });

  it('returns an empty map for missing input', () => {
    expect(toPublicAlternates(undefined)).toEqual({});
  });
});

describe('toPublicJsonLd', () => {
  it('rewrites every page URL in a backend @graph, keeping asset URLs', () => {
    const backendGraph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': 'https://api.bibliaris.com/en/tag/fear#webpage',
          url: 'https://api.bibliaris.com/en/tag/fear',
          isPartOf: { '@id': 'https://api.bibliaris.com/#website' },
          image: 'https://media.bibliaris.com/covers/2026/07/cover.png',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, item: 'https://api.bibliaris.com/en' },
          ],
        },
      ],
    };

    const sanitized = JSON.stringify(toPublicJsonLd(backendGraph));

    expect(sanitized).not.toMatch(/api\.bibliaris\.com/);
    expect(sanitized).toContain('"@id":"https://bibliaris.com/en/tag/fear#webpage"');
    expect(sanitized).toContain('"url":"https://bibliaris.com/en/tag/fear"');
    expect(sanitized).toContain('"isPartOf":{"@id":"https://bibliaris.com/#website"}');
    expect(sanitized).toContain('"item":"https://bibliaris.com/en"');
    // Covers really do live on the media host — must survive untouched.
    expect(sanitized).toContain('"image":"https://media.bibliaris.com/covers/2026/07/cover.png"');
  });

  it('keeps non-URL strings and primitives intact', () => {
    expect(toPublicJsonLd({ name: 'Fear', numberOfItems: 3, active: true })).toEqual({
      name: 'Fear',
      numberOfItems: 3,
      active: true,
    });
  });
});

describe('public URL builders', () => {
  it('buildPublicUrl normalises a missing leading slash', () => {
    expect(buildPublicUrl('sitemap.xml')).toBe('https://bibliaris.com/sitemap.xml');
  });

  it('buildLangUrl appends the page param only past page 1', () => {
    expect(buildLangUrl('ru', '/tags')).toBe('https://bibliaris.com/ru/tags');
    expect(buildLangUrl('ru', '/tags', 1)).toBe('https://bibliaris.com/ru/tags');
    expect(buildLangUrl('ru', '/tags', 3)).toBe('https://bibliaris.com/ru/tags?page=3');
    expect(buildLangUrl('en')).toBe('https://bibliaris.com/en');
  });

  it('buildAlternateLanguages covers all languages plus x-default', () => {
    const languages = buildAlternateLanguages('/catalog');
    expect(Object.keys(languages).sort()).toEqual(
      ['en', 'es', 'fr', 'pt', 'ru', 'x-default'].sort()
    );
    Object.values(languages).forEach((url) => expect(url).not.toMatch(FORBIDDEN_HOST));
  });
});

describe('rendered SEO markup contains no service host (TZ 2.4)', () => {
  it('getPageMetadata emits a clean canonical, hreflang set and og:url', () => {
    const metadata = getPageMetadata('fr', '/genres', 'Genres', 'Description', 2);

    expect(JSON.stringify(metadata)).not.toMatch(FORBIDDEN_HOST);
    expect(metadata.alternates?.canonical).toBe('https://bibliaris.com/fr/genres?page=2');
    expect(metadata.openGraph?.url).toBe('https://bibliaris.com/fr/genres?page=2');
    expect(metadata.alternates?.languages?.['x-default']).toBe(
      'https://bibliaris.com/en/genres?page=2'
    );
  });

  it('sitemap XML built from sanitized URLs contains no service host', () => {
    const indexXml = buildSitemapIndexXml([buildPublicUrl('/sitemaps/sitemap-tags-en.xml')]);
    const urlSetXml = buildUrlSetXml([
      {
        url: toPublicUrl('https://api.bibliaris.com/en/tag/fear') as string,
        alternates: { languages: buildAlternateLanguages('/tag/fear') },
      },
    ]);

    expect(indexXml).not.toMatch(FORBIDDEN_HOST);
    expect(urlSetXml).not.toMatch(FORBIDDEN_HOST);
    expect(urlSetXml).toContain('<loc>https://bibliaris.com/en/tag/fear</loc>');
  });
});
