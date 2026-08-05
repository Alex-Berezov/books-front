import { describe, it, expect, vi, beforeEach } from 'vitest';

const getBookCards = vi.fn();

vi.mock('@/api/endpoints/public', () => ({
  getBookCards: (...args: unknown[]) => getBookCards(...args),
  getPublicCategories: vi.fn().mockResolvedValue({ data: [] }),
}));

const { generateMetadata } = await import('@/app/[lang]/catalog/page');

const params = Promise.resolve({ lang: 'en' });

describe('catalog generateMetadata', () => {
  beforeEach(() => {
    getBookCards.mockReset();
    getBookCards.mockResolvedValue({ items: [], pagination: { total: 42 } });
  });

  /**
   * A noindex page must not publish the canonical and hreflang of the indexable
   * listing it duplicates — the two signals contradict each other.
   */
  it('publishes no canonical or hreflang on a filtered catalog', async () => {
    const meta = await generateMetadata({
      params,
      searchParams: Promise.resolve({ sort: 'new' }),
    });

    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates).toBeUndefined();
    expect(meta.openGraph?.url).toBeUndefined();
  });

  it.each([{ q: 'dracula' }, { type: 'audio' }, { sort: 'popular' }])(
    'treats %o as a filter',
    async (searchParams) => {
      const meta = await generateMetadata({ params, searchParams: Promise.resolve(searchParams) });

      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates).toBeUndefined();
    }
  );

  it('keeps canonical and hreflang on the unfiltered catalog', async () => {
    const meta = await generateMetadata({ params, searchParams: Promise.resolve({}) });

    expect(meta.alternates?.canonical).toContain('/en/catalog');
    expect(meta.alternates?.languages).toBeDefined();
    // Not noindex: the clean listing is the page the filtered ones duplicate.
    expect(meta.robots).toBeUndefined();
  });
});
