import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Главная при отказе запросов книг (решение арбитра 16.10.2026, `decisions-log.md`,
 * `2026-10-16-home-empty-sections`). Отказали оба запроса - popular и new - и страница
 * не собирается: при фоновой пересборке ISR ошибка оставляет прошлую целую версию вместо
 * неполной на 5 минут. Отказ одного запроса и пустой список (это ответ, а не отказ) страницу
 * не роняют: она деградирует по частям, как прежде.
 */

const api = vi.hoisted(() => ({
  getBookCards: vi.fn(),
  getCategoryBookCards: vi.fn(),
  getPageBySystemKey: vi.fn(),
  getPublicAuthors: vi.fn(),
  getPublicCategories: vi.fn(),
  getPublicTags: vi.fn(),
  getTagBookCards: vi.fn(),
}));

vi.mock('@/api/endpoints/public', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/endpoints/public')>()),
  ...api,
}));

type PageModule = typeof import('@/app/[lang]/page');
const loadPage = async (): Promise<PageModule> => import('@/app/[lang]/page');

const params = Promise.resolve({ lang: 'en' });
const cards = (n: number) => ({
  items: Array.from({ length: n }, (_, i) => ({
    id: `book-${i}`,
    slug: `book-${i}`,
    title: `Book ${i}`,
    author: 'Author',
    authorSlug: null,
    coverImageUrl: null,
    rating: null,
    ratingsCount: 0,
    hasText: true,
    hasAudio: false,
    publishedAt: null,
    categoryIds: [],
  })),
  pagination: { page: 1, limit: 10, total: n, totalPages: n ? 1 : 0 },
});

/** Ответы книг по режиму: `popular` и `new` - из аргументов, аудио всегда пусто. */
const bookCards = (popular: unknown, fresh: unknown) =>
  api.getBookCards.mockImplementation(
    (_lang: string, _page: number, _limit: number, opts: { sort?: string; type?: string }) => {
      const value = opts?.sort === 'popular' ? popular : opts?.sort === 'new' ? fresh : cards(0);
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
    }
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.getCategoryBookCards.mockResolvedValue(cards(0));
  api.getTagBookCards.mockResolvedValue(cards(0));
  api.getPageBySystemKey.mockRejectedValue(new Error('no page'));
  api.getPublicAuthors.mockResolvedValue({
    items: [],
    pagination: { total: 0, page: 1, limit: 12, totalPages: 0 },
  });
  api.getPublicCategories.mockResolvedValue({ items: [] });
  api.getPublicTags.mockResolvedValue({ items: [] });
});

describe('главная: отказ запросов книг', () => {
  it('оба запроса книг отказали - страница не собирается', async () => {
    bookCards(new Error('backend down'), new Error('backend down'));
    const { default: Page } = await loadPage();

    await expect(Page({ params })).rejects.toThrow(/both book list requests failed/);
  });

  it('отказал только один запрос - страница собирается', async () => {
    bookCards(new Error('backend down'), cards(3));
    const { default: Page } = await loadPage();

    await expect(Page({ params })).resolves.toBeTruthy();
  });

  it('оба ответили пустыми списками - это ответ, а не отказ: страница собирается', async () => {
    bookCards(cards(0), cards(0));
    const { default: Page } = await loadPage();

    await expect(Page({ params })).resolves.toBeTruthy();
  });
});
