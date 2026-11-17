// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Страница плеера: номер главы из ссылки «Слушать» (`F08 | F08-3` Q6) переживает редирект
 * на канонический слаг, а метаданные плеера от параметра не зависят - `noindex` и без canonical.
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
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
  redirect: mocks.redirect,
}));

vi.mock('@/api/endpoints/public', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/endpoints/public')>('@/api/endpoints/public');
  return { ...actual, getBookOverview: mocks.getBookOverview };
});

vi.mock('@/lib/seo/retired-slug', () => ({
  resolveRetiredSlug: vi.fn().mockResolvedValue(null),
}));

const run = (slug: string, search: Record<string, string | string[] | undefined>) =>
  import('@/app/[lang]/book/[slug]/listen/page').then((m) =>
    m.default({
      params: Promise.resolve({ lang: 'en', slug }),
      searchParams: Promise.resolve(search),
    })
  );

describe('плеер: ?chapter=N и канонический слаг', () => {
  beforeEach(() => {
    mocks.redirect.mockClear();
    mocks.getBookOverview.mockResolvedValue({ slug: 'hamlet-canonical', versions: [] });
  });

  it('редирект на канонический слаг сохраняет номер главы', async () => {
    await expect(run('hamlet-other', { chapter: '4' })).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/en/book/hamlet-canonical/listen?chapter=4');
  });

  it('мусорный номер в редирект не переносится', async () => {
    await expect(run('hamlet-other', { chapter: 'abc' })).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/en/book/hamlet-canonical/listen');
  });

  it('метаданные плеера: noindex и без canonical с параметром', async () => {
    const { metadata } = await import('@/app/[lang]/book/[slug]/listen/page');

    expect(metadata.robots).toBe('noindex, follow');
    expect(metadata.alternates).toBeUndefined();
  });
});
