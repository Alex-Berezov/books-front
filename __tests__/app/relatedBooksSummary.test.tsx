import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authorBook } from '../fixtures/author-page';

/**
 * Блоки под пересказом (17.10.2026): «Похожие пересказы» - только книги с пересказом, ссылка сразу
 * на него; отказ ручки похожих книг страницу не роняет. Вариант по умолчанию (страница книги) прежний.
 */

const getRelatedBooks = vi.fn();

vi.mock('@/api/endpoints/public', () => ({
  getRelatedBooks: (...args: unknown[]) => getRelatedBooks(...args) as unknown,
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/en/book/hamlet/summary' }));

const loadSection = async () =>
  (await import('@/app/[lang]/book/[slug]/RelatedBooksSection')).RelatedBooksSection;

const hrefs = (container: HTMLElement) =>
  [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));

describe('RelatedBooksSection: вариант пересказа', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRelatedBooks.mockResolvedValue({
      sameAuthor: [authorBook({ id: 'b-author', slug: 'macbeth', title: 'Macbeth' })],
      similar: [
        authorBook({ id: 'b-with', slug: 'faust', title: 'Faust', hasSummary: true }),
        authorBook({ id: 'b-without', slug: 'emma', title: 'Emma', hasSummary: false }),
      ],
    });
  });

  it('похожие - только с пересказом и ведут на /summary; лимит ручки 16', async () => {
    const RelatedBooksSection = await loadSection();
    const { container } = render(
      await RelatedBooksSection({ lang: 'en', slug: 'hamlet', variant: 'summary' })
    );

    expect(getRelatedBooks).toHaveBeenCalledWith('en', 'hamlet', 16);
    expect(container.textContent).toContain('Similar book summaries');
    expect(hrefs(container)).toContain('/en/book/faust/summary');
    expect(container.textContent).not.toContain('Emma');
    // Книги того же автора ведут на страницу книги, а не на пересказ.
    expect(hrefs(container)).toContain('/en/book/macbeth');
  });

  it('ни у одной похожей нет пересказа - блока похожих нет', async () => {
    getRelatedBooks.mockResolvedValue({
      sameAuthor: [],
      similar: [authorBook({ id: 'b-without', slug: 'emma', hasSummary: false })],
    });
    const RelatedBooksSection = await loadSection();

    expect(
      await RelatedBooksSection({ lang: 'en', slug: 'hamlet', variant: 'summary' })
    ).toBeNull();
  });

  it('отказ ручки - блоков нет, страница не падает', async () => {
    getRelatedBooks.mockRejectedValue(new Error('upstream down'));
    const RelatedBooksSection = await loadSection();

    expect(
      await RelatedBooksSection({ lang: 'en', slug: 'hamlet', variant: 'summary' })
    ).toBeNull();
  });

  it('страница книги: похожие без фильтра, на страницы книг, лимит 8', async () => {
    const RelatedBooksSection = await loadSection();
    const { container } = render(await RelatedBooksSection({ lang: 'en', slug: 'hamlet' }));

    expect(getRelatedBooks).toHaveBeenCalledWith('en', 'hamlet', 8);
    expect(container.textContent).toContain('Emma');
    expect(hrefs(container).some((h) => h?.endsWith('/summary'))).toBe(false);
  });
});
