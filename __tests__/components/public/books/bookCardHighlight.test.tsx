import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookCard } from '@/components/public/books/BookCard';
import { BookCardServer } from '@/components/public/books/BookCardServer/BookCardServer';
import { authorBook } from '../../../fixtures/author-page';

/**
 * F02-3: лента `highlightLabel` («Главное» на странице автора) у обеих карточек книги. Задана —
 * она вместо «Новинки» (одна лента на обложке, решение арбитра 15.10.2026, `F02 | F02-3`, Р6);
 * не задана — карточка как везде.
 */

vi.mock('next/navigation', () => ({ usePathname: () => '/ru/author/lev-tolstoy' }));

const fresh = authorBook({ publishedAt: new Date().toISOString() });
const labels = {
  coverAltTemplate: '{title}',
  readLabel: 'Читать',
  listenLabel: 'Слушать',
  newLabel: 'Новинка',
  unknownAuthor: '—',
};

describe('highlightLabel карточки книги', () => {
  it('BookCard: лента вместо «Новинки», без неё — «Новинка»', () => {
    const { unmount } = render(<BookCard book={fresh} highlightLabel="Главное" />);
    expect(screen.getByText('Главное')).toBeInTheDocument();
    expect(screen.queryByText('Новинка')).not.toBeInTheDocument();
    unmount();

    render(<BookCard book={fresh} />);
    expect(screen.getByText('Новинка')).toBeInTheDocument();
    expect(screen.queryByText('Главное')).not.toBeInTheDocument();
  });

  it('BookCardServer: лента вместо «Новинки», без неё — «Новинка»', () => {
    const { unmount } = render(
      <BookCardServer book={fresh} lang="ru" labels={labels} highlightLabel="Главное" />
    );
    expect(screen.getByText('Главное')).toBeInTheDocument();
    expect(screen.queryByText('Новинка')).not.toBeInTheDocument();
    unmount();

    render(<BookCardServer book={fresh} lang="ru" labels={labels} />);
    expect(screen.getByText('Новинка')).toBeInTheDocument();
  });
});

/** Блок «Похожие пересказы» под пересказом: карточка ведёт сразу на пересказ книги. */
describe('linkTarget карточки книги', () => {
  const hrefs = (container: HTMLElement) =>
    [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));

  it('summary: обложка и название ведут на /book/{slug}/summary', () => {
    const { container } = render(
      <BookCardServer book={fresh} lang="ru" labels={labels} linkTarget="summary" />
    );
    expect(hrefs(container).filter((h) => h?.endsWith('/summary'))).toEqual([
      '/ru/book/voyna-i-mir/summary',
      '/ru/book/voyna-i-mir/summary',
    ]);
  });

  it('по умолчанию - страница книги', () => {
    const { container } = render(<BookCardServer book={fresh} lang="ru" labels={labels} />);
    expect(hrefs(container).some((h) => h?.endsWith('/summary'))).toBe(false);
    expect(hrefs(container)).toContain('/ru/book/voyna-i-mir');
  });

  it('summary без слага - ссылка на страницу книги, а не на пересказ по id', () => {
    const { container } = render(
      <BookCardServer
        book={{ ...fresh, slug: '' }}
        lang="ru"
        labels={labels}
        linkTarget="summary"
      />
    );
    expect(hrefs(container).some((h) => h?.endsWith('/summary'))).toBe(false);
  });
});
