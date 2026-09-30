import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpGet = vi.fn();

vi.mock('@/lib/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/http')>()),
  httpGet: (...args: unknown[]) => httpGet(...args),
}));

const { generateMetadata } = await import('@/app/[lang]/tag/[tagSlug]/page');

const props = {
  params: Promise.resolve({ lang: 'en', tagSlug: 'adventure' }),
  searchParams: Promise.resolve({}),
};

/**
 * `LEGACY-417`/`LEGACY-422`, `T74`. The SEO bundle is unreadable, so the only thing allowed
 * to narrow the verdict is the half computable from `/books/cards`. Hysteresis of the
 * translation (`autoIndexable`) is part of that half: a term closed by it answers
 * `noindex`, not 5xx — the same rule the book-page chips and the sitemap apply.
 */
const arrange = (translation: { autoIndexable?: boolean } | null) => {
  httpGet.mockImplementation((url: string) => {
    if (url.includes('/books/cards')) {
      return Promise.resolve({
        tag: { id: 't1', isVisible: true, indexable: true, translation },
        items: [],
        pagination: { page: 1, limit: 1, total: 5, totalPages: 5 },
      });
    }
    return Promise.reject(new Error('bundle down'));
  });
};

describe('tag page metadata, unreadable SEO bundle', () => {
  beforeEach(() => {
    httpGet.mockReset();
  });

  it('answers noindex when the translation is closed by hysteresis', async () => {
    arrange({ autoIndexable: false });

    const meta = await generateMetadata(props);

    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('still refuses to guess (5xx) when the translation is open by hysteresis', async () => {
    arrange({ autoIndexable: true });

    await expect(generateMetadata(props)).rejects.toThrow();
  });

  it('still refuses to guess when the hysteresis state is not known', async () => {
    arrange(null);

    await expect(generateMetadata(props)).rejects.toThrow();
  });
});
