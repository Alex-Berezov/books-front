// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Подсчёт лендингов вынесен из `sitemap-static.xml` в `lib/seo/landing-presence.ts` (общий
 * с `/llms.txt`). Посадка стережёт проводку: известно пустой лендинг выпадает из карты,
 * отказ счётчика его оставляет, остальные языки не задеты.
 */
const getBookCards = vi.fn();

vi.mock('@/api/endpoints/public', () => ({
  getBookCards: (...args: unknown[]) => getBookCards(...args) as unknown,
  getPublicBooks: vi.fn(async () => ({ items: [], pagination: { total: 0, totalPages: 0 } })),
  getPublicCategories: vi.fn(async () => ({ items: [], pagination: { total: 0, totalPages: 0 } })),
  getPublicTags: vi.fn(async () => ({ items: [], pagination: { total: 0, totalPages: 0 } })),
  getPublicAuthors: vi.fn(async () => ({ items: [], pagination: { total: 0, totalPages: 0 } })),
  getAuthorLetters: vi.fn(async () => ({
    items: [],
    pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
  })),
}));

const callGet = async (filename: string): Promise<string> => {
  const { GET } = await import('@/app/sitemaps/[filename]/route');
  const res = await GET(new Request(`https://bibliaris.com/sitemaps/${filename}`), {
    params: { filename },
  });
  return res.text();
};

describe('sitemap-static.xml: лендинги со счётчиком', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://bibliaris.com');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('убирает известно пустой лендинг и оставляет лендинг с отказом счётчика', async () => {
    getBookCards.mockImplementation(
      async (lang: string, _p: number, _l: number, params: { type?: string; sort?: string }) => {
        if (lang === 'fr' && params.type === 'audio')
          return { items: [], pagination: { total: 0 } };
        if (lang === 'fr' && params.sort === 'new') throw new Error('upstream down');
        return { items: [], pagination: { total: 4 } };
      }
    );

    const xml = await callGet('sitemap-static.xml');

    expect(xml).not.toContain('<loc>https://bibliaris.com/fr/audiobooks</loc>');
    expect(xml).toContain('<loc>https://bibliaris.com/en/audiobooks</loc>');
    expect(xml).toContain('<loc>https://bibliaris.com/fr/new-releases</loc>');
    expect(xml).toContain('<loc>https://bibliaris.com/fr/popular-books</loc>');
  });
});
