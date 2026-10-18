// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAnalysisAlternates } from '@/lib/seo/book-analysis';

/**
 * Анализ - отдельный индексируемый адрес `/{lang}/book/{slug}/analysis` (F03, D1). Карта сайта
 * кладёт его в файл книг языка, только если счётчик `_count.analyses` версии этого языка
 * подтверждает анализ (ядро, не закрыт окончённой претензией), а hreflang - только между
 * языками с анализом и тем же правилом, что у меты страницы (`product.md` §22).
 */

const SITE = 'https://bibliaris.com';

const getPublicBooks = vi.fn();

vi.mock('@/api/endpoints/public', () => ({
  getPublicBooks: (...args: unknown[]) => getPublicBooks(...args) as unknown,
  getPublicCategories: vi.fn(),
  getPublicTags: vi.fn(),
  getBookCards: vi.fn(),
  getPublicAuthors: vi.fn(),
  getAuthorLetters: vi.fn(),
}));

const listVersion = (language: string, slug: string, summaries: number, analyses: number) => ({
  id: `v-${slug}`,
  bookId: 'b',
  language,
  status: 'published',
  type: 'text',
  title: slug,
  author: 'a',
  coverImageUrl: '',
  description: '',
  slug,
  isFree: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  _count: { chapters: 1, audioChapters: 0, summaries, analyses },
  tags: [],
});

const book = (id: string, versions: ReturnType<typeof listVersion>[]) => ({
  id,
  slug: id,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-10T00:00:00.000Z',
  hasText: true,
  hasAudio: false,
  hasSummary: versions.some((v) => v._count.summaries > 0),
  versions,
});

const hamletVersions = [
  listVersion('en', 'hamlet', 0, 1),
  listVersion('fr', 'hamlet-fr', 1, 1),
  listVersion('ru', 'gamlet', 1, 0),
];

const serve = (items: ReturnType<typeof book>[]) =>
  getPublicBooks.mockImplementation(async (_lang: string, params: { page?: number }) =>
    params.page === 1
      ? { items, pagination: { total: items.length, page: 1, limit: 100, totalPages: 1 } }
      : { items: [], pagination: { total: items.length, page: 2, limit: 100, totalPages: 1 } }
  );

const callGet = async (filename: string) => {
  const { GET } = await import('@/app/sitemaps/[filename]/route');
  return GET(new Request(`${SITE}/sitemaps/${filename}`), {
    params: Promise.resolve({ filename }),
  });
};

const urlBlock = (xml: string, loc: string) => {
  const start = xml.indexOf(`<loc>${loc}</loc>`);
  if (start < 0) return null;
  return xml.slice(start, xml.indexOf('</url>', start));
};

const hreflangs = (block: string) =>
  Object.fromEntries(
    [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]])
  );

describe('карта сайта: адреса анализа', () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  afterAll(() => {
    if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    serve([book('hamlet', hamletVersions), book('emma', [listVersion('en', 'emma', 1, 0)])]);
  });

  // У английской версии нет пересказа, а анализ есть: адрес анализа не должен зависеть от пересказа.
  it('анализ языка файла - свой адрес, hreflang только языков с анализом', async () => {
    const xml = await (await callGet('sitemap-books-en-1.xml')).text();

    const block = urlBlock(xml, `${SITE}/en/book/hamlet/analysis`);
    expect(block).not.toBeNull();
    expect(block).toContain(`hreflang="fr" href="${SITE}/fr/book/hamlet-fr/analysis"`);
    expect(block).toContain(`hreflang="x-default" href="${SITE}/en/book/hamlet/analysis"`);
    expect(block).not.toContain('gamlet');
    expect(xml).not.toContain('/en/book/hamlet/summary');
  });

  // hreflang карты и меты страницы - одно правило на одном наборе версий (`product.md` §22).
  it('кластер карты сайта совпадает с hreflang меты страницы', async () => {
    const xml = await (await callGet('sitemap-books-en-1.xml')).text();
    const block = urlBlock(xml, `${SITE}/en/book/hamlet/analysis`) ?? '';

    expect(hreflangs(block)).toEqual(buildAnalysisAlternates(hamletVersions));
  });

  it('у книги нет анализа - адреса анализа нет, пересказ на месте', async () => {
    const xml = await (await callGet('sitemap-books-en-1.xml')).text();

    expect(xml).toContain(`<loc>${SITE}/en/book/emma/summary</loc>`);
    expect(xml).not.toContain('/en/book/emma/analysis');
  });

  it('у версии языка файла нет анализа - адреса нет, хотя у других языков есть', async () => {
    const xml = await (await callGet('sitemap-books-ru-1.xml')).text();

    expect(xml).toContain(`<loc>${SITE}/ru/book/gamlet/summary</loc>`);
    expect(xml).not.toContain('/analysis');
  });

  it('нет счётчика анализа у версии языка файла - 503, а не похудевшая карта', async () => {
    const broken = listVersion('en', 'odd', 1, 1) as Record<string, unknown>;
    broken._count = { chapters: 1, audioChapters: 0, summaries: 1 };
    serve([{ ...book('odd', [listVersion('en', 'odd', 1, 1)]), versions: [broken as never] }]);

    const res = await callGet('sitemap-books-en-1.xml');

    expect(res.status).toBe(503);
  });
});
