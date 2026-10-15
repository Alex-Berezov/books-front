// @vitest-environment node
import type { ReactElement, ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSiteUrl } from '@/lib/seo/urls';
import type { PublicAuthorDetail } from '@/types/api-schema';

/**
 * F02-1: метаданные и разметка страницы автора — hreflang по слагам языков, картинка
 * для соцсетей из портрета, описание из биографии, счёт от `booksTotal`, `Person` всегда
 * с тем же `@id`, что у разметки книг, и крошки из трёх звеньев.
 */

const mocks = vi.hoisted(() => ({
  getPublicAuthorBySlug: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  permanentRedirect: vi.fn(),
}));
vi.mock('@/lib/seo/retired-slug', () => ({ resolveRetiredSlug: vi.fn() }));
vi.mock('@/api/endpoints/public', () => ({
  getPublicAuthorBySlug: mocks.getPublicAuthorBySlug,
}));
// Клиентская часть страницы здесь не рендерится — проверяются метаданные и разметка.
vi.mock('@/app/[lang]/author/[authorSlug]/AuthorDetailClient', () => ({
  default: () => null,
}));

type PageModule = typeof import('@/app/[lang]/author/[authorSlug]/page');
let pageModule: PageModule;

beforeAll(async () => {
  pageModule = await import('@/app/[lang]/author/[authorSlug]/page');
}, 60_000);

const params = Promise.resolve({ lang: 'ru', authorSlug: 'oskar-uajld' });

const fullAuthor = (over: Partial<PublicAuthorDetail> = {}): PublicAuthorDetail => ({
  id: 'auth1',
  slug: 'oskar-uajld',
  name: 'Оскар Уайльд',
  biography: '<p>Оскар Уайльд — ирландский писатель и драматург.</p>',
  photoUrl: 'https://media.bibliaris.com/authors/wilde.jpg',
  birthDate: '1854-10-16',
  deathDate: '1900-11-30',
  wikidataUrl: 'https://www.wikidata.org/wiki/Q30875',
  wikipediaUrl: null,
  quotes: [],
  faq: [],
  seo: null,
  similarAuthors: [],
  alternates: [
    { lang: 'en', slug: 'oscar-wilde', indexable: true },
    { lang: 'ru', slug: 'oskar-uajld', indexable: true },
    { lang: 'es', slug: 'oscar-wilde-es', indexable: false },
  ],
  booksTotal: 2,
  books: [],
  // Блоки F02-2: бэкенд отдаёт их всегда, пустые — `[]` или `null`.
  nativeName: null,
  photoCredit: null,
  tagline: null,
  facts: null,
  notableWorks: [],
  startHere: [],
  timeline: [],
  influences: null,
  awards: [],
  adaptations: [],
  funFacts: [],
  sources: [],
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

/** Тексты всех `<script type="application/ld+json">` из дерева страницы. */
function jsonLdOf(node: ReactNode): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (n: ReactNode) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== 'object' || !('props' in n)) return;
    const el = n as ReactElement<{
      type?: string;
      dangerouslySetInnerHTML?: { __html: string };
      children?: ReactNode;
    }>;
    if (el.type === 'script' && el.props.dangerouslySetInnerHTML) {
      out.push(JSON.parse(el.props.dangerouslySetInnerHTML.__html) as Record<string, unknown>);
    }
    walk(el.props.children);
  };
  walk(node);
  return out;
}

describe('страница автора: метаданные (F02-1)', () => {
  beforeEach(() => {
    mocks.getPublicAuthorBySlug.mockReset();
  });

  it('hreflang — слаги языков, только индексируемые, x-default из отобранных', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(fullAuthor());
    const base = getSiteUrl();

    const meta = await pageModule.generateMetadata({ params });

    expect(meta.alternates?.canonical).toBe(`${base}/ru/author/oskar-uajld`);
    expect(meta.alternates?.languages).toEqual({
      en: `${base}/en/author/oscar-wilde`,
      ru: `${base}/ru/author/oskar-uajld`,
      'x-default': `${base}/en/author/oscar-wilde`,
    });
  });

  it('своя canonical из SEO заменяет адрес, кластер hreflang остаётся', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(
      fullAuthor({
        seo: { canonicalUrl: 'https://bibliaris.com/en/author/oscar-wilde' },
      } as Partial<PublicAuthorDetail>)
    );

    const meta = await pageModule.generateMetadata({ params });

    expect(meta.alternates?.canonical).toBe('https://bibliaris.com/en/author/oscar-wilde');
    expect(Object.keys(meta.alternates?.languages ?? {}).sort()).toEqual(['en', 'ru', 'x-default']);
  });

  it('без alternates в ответе (бэкенд до F02-1) кластера нет, canonical остаётся', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(fullAuthor({ alternates: undefined }));

    const meta = await pageModule.generateMetadata({ params });

    expect(meta.alternates?.languages).toBeUndefined();
    expect(meta.alternates?.canonical).toBe(`${getSiteUrl()}/ru/author/oskar-uajld`);
  });

  it('картинка для соцсетей — портрет, если своей нет; описание — из биографии', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(fullAuthor());

    const meta = await pageModule.generateMetadata({ params });

    expect(meta.openGraph?.images).toEqual([
      { url: 'https://media.bibliaris.com/authors/wilde.jpg' },
    ]);
    expect(meta.description).toBe('Оскар Уайльд — ирландский писатель и драматург.');
  });

  it('своя картинка из SEO важнее портрета', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(
      fullAuthor({
        seo: { ogImageUrl: 'https://media.bibliaris.com/og/wilde.png', ogImageAlt: 'Уайльд' },
      } as Partial<PublicAuthorDetail>)
    );

    const meta = await pageModule.generateMetadata({ params });

    expect(meta.openGraph?.images).toEqual([
      { url: 'https://media.bibliaris.com/og/wilde.png', alt: 'Уайльд' },
    ]);
  });

  it('счёт для noindex — booksTotal, а не длина списка', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(fullAuthor({ booksTotal: 0, books: [] }));
    expect((await pageModule.generateMetadata({ params })).robots).toEqual({
      index: false,
      follow: true,
    });

    mocks.getPublicAuthorBySlug.mockResolvedValue(fullAuthor({ booksTotal: 5, books: [] }));
    expect((await pageModule.generateMetadata({ params })).robots).toBeUndefined();
  });

  // Ответ бэкенда до F02-1: `booksTotal` нет — счёт от длины списка, а не «неизвестно» и не ноль.
  it('без booksTotal счёт берётся из длины списка', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(fullAuthor({ booksTotal: undefined, books: [] }));
    expect((await pageModule.generateMetadata({ params })).robots).toEqual({
      index: false,
      follow: true,
    });
  });

  // Отказ бэкенда — не ноль: решение об индексации не принимается.
  it('при отказе запроса noindex не ставится', async () => {
    mocks.getPublicAuthorBySlug.mockRejectedValue(new Error('upstream down'));
    expect((await pageModule.generateMetadata({ params })).robots).toBeUndefined();
  });

  it('SEO-запись без своей картинки — портрет в og и twitter', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(
      fullAuthor({
        seo: { twitterCard: 'summary_large_image', ogImageAlt: 'чужая подпись' },
      } as Partial<PublicAuthorDetail>)
    );

    const meta = await pageModule.generateMetadata({ params });

    expect(meta.openGraph?.images).toEqual([
      { url: 'https://media.bibliaris.com/authors/wilde.jpg' },
    ]);
    expect((meta.twitter as { images?: unknown })?.images).toEqual([
      'https://media.bibliaris.com/authors/wilde.jpg',
    ]);
  });

  it('без биографии и своего описания — шаблон языка', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(fullAuthor({ biography: null }));

    const meta = await pageModule.generateMetadata({ params });

    expect(meta.description).toContain('Оскар Уайльд');
    expect(meta.description).toContain('Bibliaris');
  });
});

describe('страница автора: разметка (F02-1)', () => {
  beforeEach(() => {
    mocks.getPublicAuthorBySlug.mockReset();
  });

  /**
   * 🔴 `@id` — литерал той строки, что строит бэкенд для автора книги
   * (`generateBookSchema.ts`: `normalizeUrl(site + /ru/author/oskar-uajld) + #person`).
   */
  it('Person с @id как у книг, url, image и description — у полного автора', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(fullAuthor());
    const base = getSiteUrl();

    const blocks = jsonLdOf(await pageModule.default({ params }));
    const person = blocks.find((b) => b['@type'] === 'Person');

    expect(person).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${base}/ru/author/oskar-uajld#person`,
      name: 'Оскар Уайльд',
      url: `${base}/ru/author/oskar-uajld`,
      image: 'https://media.bibliaris.com/authors/wilde.jpg',
      description: 'Оскар Уайльд — ирландский писатель и драматург.',
      birthDate: '1854-10-16',
      deathDate: '1900-11-30',
      sameAs: ['https://www.wikidata.org/wiki/Q30875'],
    });
  });

  it('описание Person — своё описание раньше биографии, как у метаданных', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(
      fullAuthor({ seo: { metaDescription: 'Своё описание' } } as Partial<PublicAuthorDetail>)
    );

    const blocks = jsonLdOf(await pageModule.default({ params }));

    expect(blocks.find((b) => b['@type'] === 'Person')?.description).toBe('Своё описание');
  });

  it('Person выводится и у минимального автора — без дат и ссылок', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(
      fullAuthor({
        biography: null,
        photoUrl: null,
        birthDate: null,
        deathDate: null,
        wikidataUrl: null,
      })
    );
    const base = getSiteUrl();

    const blocks = jsonLdOf(await pageModule.default({ params }));

    expect(blocks.find((b) => b['@type'] === 'Person')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${base}/ru/author/oskar-uajld#person`,
      name: 'Оскар Уайльд',
      url: `${base}/ru/author/oskar-uajld`,
    });
  });

  it('крошки разметки — Главная → Авторы → имя, один блок на страницу', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(fullAuthor());
    const base = getSiteUrl();

    const crumbs = jsonLdOf(await pageModule.default({ params })).filter(
      (b) => b['@type'] === 'BreadcrumbList'
    );

    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${base}/ru` },
      { '@type': 'ListItem', position: 2, name: 'Авторы', item: `${base}/ru/authors` },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Оскар Уайльд',
        item: `${base}/ru/author/oskar-uajld`,
      },
    ]);
  });
});
