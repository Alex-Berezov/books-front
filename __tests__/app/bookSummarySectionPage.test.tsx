import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildLangUrl } from '@/lib/seo/urls';
import { ApiError } from '@/types/api';

/**
 * Страница раздела пересказа `/{lang}/book/{slug}/summary/{n}` (F04-3, `product.md` §3, §5, §6):
 * серверный рендер, номер по общему правилу, 451 на весь мир - 404, навигация пред./след.,
 * «Читать эту главу» по трём условиям, hreflang только свой язык, noindex книги.
 */

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn(() => {
    throw new Error('NEXT_PERMANENT_REDIRECT');
  }),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  getBookOverview: vi.fn(),
  getPublicSummarySection: vi.fn(),
  resolveSeo: vi.fn(),
  resolveRetiredSlug: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
  redirect: mocks.redirect,
  usePathname: () => '/en/book/oblomov/summary/2',
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/api/endpoints/public', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/endpoints/public')>('@/api/endpoints/public');
  return {
    ...actual,
    getBookOverview: mocks.getBookOverview,
    getPublicSummarySection: mocks.getPublicSummarySection,
    resolveSeo: mocks.resolveSeo,
  };
});

vi.mock('@/lib/seo/retired-slug', () => ({
  resolveRetiredSlug: mocks.resolveRetiredSlug,
}));

const CONTENT_DATE = '2026-10-15T08:00:00.000Z';
const TOC = [
  { number: 1, title: 'Part one' },
  { number: 2, title: 'Part two' },
  { number: 3, title: 'Part three' },
];

const version = (language: string, slug: string, summaries: number) => ({
  id: `v-${language}`,
  type: 'text',
  language,
  slug,
  title: 'Oblomov',
  author: 'Ivan Goncharov',
  isFree: true,
  translators: [],
  _count: { chapters: 3, audioChapters: 0, summaries, analyses: 0 },
});

const makeBook = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  slug: 'oblomov',
  title: 'Oblomov',
  author: 'Ivan Goncharov',
  authorSlug: 'ivan-goncharov',
  firstPublishedYear: 1859,
  primaryCategory: { name: 'Novel' },
  versionIds: { text: 'v-en', audio: null },
  versions: [version('en', 'oblomov', 1), version('fr', 'oblomov-fr', 1)],
  ...over,
});

const section = (n: number, over: Record<string, unknown> = {}) => ({
  id: `sec-${n}`,
  number: n,
  title: TOC[n - 1]?.title ?? `Part ${n}`,
  text: `<h1>Inner</h1><p>Text of part ${n}. Oblomov lies on his sofa.</p>`,
  readerChapter: n,
  readerChapterExists: true,
  contentDate: CONTENT_DATE,
  sections: TOC,
  briefHasText: false,
  ...over,
});

const loadPage = () => import('@/app/[lang]/book/[slug]/summary/[n]/page');

const renderPage = async (n: string, lang = 'en', slug = 'oblomov') => {
  const { default: Page } = await loadPage();
  const el = await Page({ params: Promise.resolve({ lang, slug, n }) });
  return render(el);
};

const metadataFor = async (n: string, lang = 'en', slug = 'oblomov') => {
  const { generateMetadata } = await loadPage();
  return generateMetadata({ params: Promise.resolve({ lang, slug, n }) });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.notFound.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
  mocks.redirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
  mocks.resolveRetiredSlug.mockResolvedValue(null);
  mocks.getBookOverview.mockResolvedValue(makeBook());
  mocks.getPublicSummarySection.mockImplementation((_id: string, n: number) =>
    Promise.resolve(section(n))
  );
  mocks.resolveSeo.mockResolvedValue({ meta: { robots: 'index, follow' } });
});

describe('страница раздела: содержимое', () => {
  it('текст в серверном HTML, один h1 по формуле, крошки до названия раздела', async () => {
    const { container } = await renderPage('2');

    expect(mocks.getPublicSummarySection).toHaveBeenCalledWith('v-en', 2);
    const h1 = container.querySelectorAll('h1');
    expect(h1).toHaveLength(1);
    expect(h1[0].textContent).toBe('Oblomov: Part two — Summary');
    expect(container.textContent).toContain('Text of part 2. Oblomov lies on his sofa.');
    expect(container.textContent).toContain(
      'Spoiler warning: this summary covers the whole plot of this section.'
    );
    const crumbs = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect([...crumbs.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '/en',
      '/en/catalog',
      '/en/book/oblomov',
      '/en/book/oblomov/summary',
    ]);
    expect(crumbs.textContent).toContain('Part two');
  });

  it('разметка Article с isPartOf на пересказ и датой раздела', async () => {
    const { container } = await renderPage('2');
    const scripts = [...container.querySelectorAll('script[type="application/ld+json"]')];
    const article = scripts
      .map((el) => JSON.parse(el.textContent ?? '{}') as Record<string, unknown>)
      .find((json) => json['@type'] === 'Article');
    expect(article).toMatchObject({
      headline: 'Oblomov: Part two — Summary',
      url: buildLangUrl('en', '/book/oblomov/summary/2'),
      dateModified: CONTENT_DATE,
      isPartOf: { '@type': 'Article', url: buildLangUrl('en', '/book/oblomov/summary') },
    });
    expect(container.textContent).toContain('October 15, 2026');
  });

  it.each([
    ['первый', '1', null, 'Part two'],
    ['средний', '2', 'Part one', 'Part three'],
    ['последний', '3', 'Part two', null],
  ])('%s раздел: пред./след. названиями', async (_name, n, prev, next) => {
    const { container } = await renderPage(n);
    const prevLink = container.querySelector('a[rel="prev"]');
    const nextLink = container.querySelector('a[rel="next"]');
    expect(prevLink?.textContent?.replace('← ', '') ?? null).toBe(prev);
    expect(nextLink?.textContent?.replace(' →', '') ?? null).toBe(next);
  });

  it('оглавление: все разделы, текущий отмечен и не ссылка', async () => {
    await renderPage('2');
    const toc = screen.getByRole('navigation', { name: 'Chapter-by-chapter summary' });
    expect([...toc.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '/en/book/oblomov/summary/1',
      '/en/book/oblomov/summary/3',
    ]);
    expect(toc.querySelector('[aria-current="page"]')?.textContent).toBe('Part two');
  });

  it('навигация книги: «Summary» отмечен текущим и ведёт на /summary', async () => {
    await renderPage('2');
    const nav = screen.getByRole('navigation', { name: 'Book sections' });
    const current = nav.querySelector('[aria-current]');
    expect(current?.tagName).toBe('A');
    expect(current?.getAttribute('href')).toBe('/en/book/oblomov/summary');
  });

  it.each([
    ['глава есть', { readerChapter: 2, readerChapterExists: true }, makeBook(), true],
    ['глава не указана', { readerChapter: null, readerChapterExists: false }, makeBook(), false],
    ['главы нет в версии', { readerChapter: 9, readerChapterExists: false }, makeBook(), false],
    [
      'у версии нет текста',
      { readerChapter: 2, readerChapterExists: true },
      makeBook({ versionIds: { text: null, audio: null } }),
      false,
    ],
  ])('«Read this chapter»: %s', async (_name, over, book, shown) => {
    mocks.getBookOverview.mockResolvedValue(book);
    mocks.getPublicSummarySection.mockResolvedValue(section(2, over));
    await renderPage('2');
    const link = screen.queryByRole('link', { name: 'Read this chapter' });
    if (shown) expect(link?.getAttribute('href')).toBe('/en/book/oblomov/read?chapter=2');
    else expect(link).toBeNull();
  });

  it('ссылки: «In brief» только при блоке, «Full summary» всегда', async () => {
    const { unmount } = await renderPage('2');
    expect(screen.queryByRole('link', { name: 'In brief' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Full summary' }).getAttribute('href')).toBe(
      '/en/book/oblomov/summary'
    );
    unmount();

    mocks.getPublicSummarySection.mockResolvedValue(section(2, { briefHasText: true }));
    await renderPage('2');
    expect(screen.getByRole('link', { name: 'In brief' }).getAttribute('href')).toBe(
      '/en/book/oblomov/summary#brief'
    );
  });

  // Название - текст редакции: `$&`, `$$` и `{section}` в нём не шаблон подстановки.
  it('знаки $ и {section} в названиях выводятся как есть', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        title: 'Fish $& Chips {section}',
        versions: [{ ...version('en', 'oblomov', 1), title: 'Fish $& Chips {section}' }],
      })
    );
    mocks.getPublicSummarySection.mockResolvedValue(section(2, { title: 'Price $$' }));

    const { container } = await renderPage('2');

    expect(container.querySelector('h1')?.textContent).toBe(
      'Fish $& Chips {section}: Price $$ — Summary'
    );
  });

  it('ссылка на анализ - только при анализе, подписью как на /summary', async () => {
    const { unmount } = await renderPage('2');
    expect(screen.queryByRole('link', { name: 'Analysis and interpretation' })).toBeNull();
    unmount();

    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [
          {
            ...version('en', 'oblomov', 1),
            _count: { chapters: 3, audioChapters: 0, summaries: 1, analyses: 1 },
          },
        ],
      })
    );
    await renderPage('2');
    expect(
      screen.getByRole('link', { name: 'Analysis and interpretation' }).getAttribute('href')
    ).toBe('/en/book/oblomov/analysis');
  });

  it('ru: h1 и спойлер по §5а', async () => {
    mocks.getBookOverview.mockResolvedValue(makeBook({ versions: [version('ru', 'oblomov', 1)] }));
    const { container } = await renderPage('2', 'ru');
    expect(container.querySelector('h1')?.textContent).toBe(
      'Oblomov: Part two — краткое содержание'
    );
    expect(container.textContent).toContain(
      'Осторожно, спойлеры: пересказ раздела передаёт его сюжет целиком.'
    );
  });
});

describe('страница раздела: 404, 451 и отказы', () => {
  it.each(['0', '01', 'abc', '1.5', '-1', '1000000'])(
    'кривой номер %s - 404 до запроса',
    async (n) => {
      await expect(renderPage(n)).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mocks.getBookOverview).not.toHaveBeenCalled();
      expect(mocks.getPublicSummarySection).not.toHaveBeenCalled();
    }
  );

  it('раздела нет (404 ручки) - 404', async () => {
    mocks.getPublicSummarySection.mockRejectedValue(
      new ApiError({ message: 'Not found', statusCode: 404 })
    );
    await expect(renderPage('7')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('451 ручки (блок на весь мир) - 404, а не 5xx', async () => {
    mocks.getPublicSummarySection.mockRejectedValue(
      new ApiError({ message: 'Unavailable', statusCode: 451 })
    );
    await expect(renderPage('2')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('сбой ручки - наверх (5xx)', async () => {
    mocks.getPublicSummarySection.mockRejectedValue(
      new ApiError({ message: 'Boom', statusCode: 500 })
    );
    await expect(renderPage('2')).rejects.toThrow('Boom');
  });

  it('у языка нет пересказа - 404 без запроса раздела', async () => {
    mocks.getBookOverview.mockResolvedValue(makeBook({ versions: [version('en', 'oblomov', 0)] }));
    await expect(renderPage('2')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.getPublicSummarySection).not.toHaveBeenCalled();
  });

  it('пустое тело ручки - 404, как у пересказа', async () => {
    mocks.getPublicSummarySection.mockResolvedValue(null);
    await expect(renderPage('2')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('раздел без видимого текста - 404', async () => {
    mocks.getPublicSummarySection.mockResolvedValue(section(2, { text: '<p>&nbsp;</p>' }));
    await expect(renderPage('2')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it.each([
    ['без списка разделов', { sections: undefined }],
    ['без названия раздела', { title: undefined }],
  ])('ответ не той формы (%s) - отказ, а не 404', async (_name, over) => {
    mocks.getPublicSummarySection.mockResolvedValue(section(2, over));
    await expect(renderPage('2')).rejects.toThrow(/unexpected shape/);
  });

  it('неканонический слаг - 307 на канонический адрес раздела', async () => {
    await expect(renderPage('2', 'en', 'Oblomov-old')).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/en/book/oblomov/summary/2');
  });
});

describe('страница раздела: метаданные', () => {
  it('title по формуле с брендом, описание из текста, canonical на себя, hreflang только свой', async () => {
    const meta = await metadataFor('2');
    const own = buildLangUrl('en', '/book/oblomov/summary/2');

    expect(meta.title).toBe('Oblomov: Part two — Summary | Bibliaris');
    expect(meta.description).toBe('Text of part 2. Oblomov lies on his sofa.');
    expect(meta.alternates?.canonical).toBe(own);
    expect(meta.alternates?.languages).toEqual({ en: own, 'x-default': own });
    expect(meta.robots).toBeUndefined();
  });

  it.each(['noindex', 'NoIndex, follow', 'none', 'googlebot: noindex'])(
    'книга закрыта (%s) - noindex и без hreflang',
    async (robots) => {
      mocks.resolveSeo.mockResolvedValue({ meta: { robots } });
      const meta = await metadataFor('2');
      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates?.languages).toBeUndefined();
    }
  );

  it('max-image-preview:none не закрывает раздел', async () => {
    mocks.resolveSeo.mockResolvedValue({ meta: { robots: 'index, max-image-preview:none' } });
    expect((await metadataFor('2')).robots).toBeUndefined();
  });

  it('кривой номер и 451 - noindex без 5xx', async () => {
    expect((await metadataFor('abc')).robots).toEqual({ index: false, follow: true });
    mocks.getPublicSummarySection.mockRejectedValue(
      new ApiError({ message: 'Unavailable', statusCode: 451 })
    );
    expect((await metadataFor('2')).robots).toEqual({ index: false, follow: true });
  });

  it.each([
    [
      'раздела нет (404 ручки)',
      () =>
        mocks.getPublicSummarySection.mockRejectedValue(
          new ApiError({ message: 'Not found', statusCode: 404 })
        ),
    ],
    [
      'у языка нет пересказа',
      () =>
        mocks.getBookOverview.mockResolvedValue(
          makeBook({ versions: [version('en', 'oblomov', 0)] })
        ),
    ],
    [
      'ответ без названия',
      () => mocks.getPublicSummarySection.mockResolvedValue(section(2, { title: undefined })),
    ],
    [
      'ответ без текста',
      () => mocks.getPublicSummarySection.mockResolvedValue(section(2, { text: undefined })),
    ],
  ])('%s - noindex без 5xx', async (_name, arrange) => {
    arrange();
    const meta = await metadataFor('2');
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.title).toBeUndefined();
  });

  it('сбой API - наверх (5xx)', async () => {
    mocks.getPublicSummarySection.mockRejectedValue(
      new ApiError({ message: 'Boom', statusCode: 500 })
    );
    await expect(metadataFor('2')).rejects.toThrow('Boom');
  });
});
