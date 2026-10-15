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
