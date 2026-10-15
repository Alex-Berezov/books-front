import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorBooks } from '@/components/public/author/AuthorBooks/AuthorBooks';
import { authorBook, fullAuthor, minimalAuthor } from '../../../fixtures/author-page';

/**
 * F02-3, `product.md` §7: книги автора — порция с сервера, лента «Главное», «Показать все»
 * без смены адреса (страницы `/books/cards` по 48, показанные отбрасываются по `id`).
 */

const { cardsSpy } = vi.hoisted(() => ({ cardsSpy: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/author/lev-tolstoy',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/api/endpoints/public', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/endpoints/public')>()),
  getAuthorBookCards: (...args: unknown[]) => cardsSpy(...args),
}));

const withClient = (node: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(QueryClientProvider, { client }, node));
};

const twelve = Array.from({ length: 12 }, (_, i) =>
  authorBook({ id: `b${i}`, slug: `book-${i}`, title: `Книга ${i}` })
);

describe('AuthorBooks', () => {
  beforeEach(() => cardsSpy.mockReset());

  it('заголовок с именем, карточки по порядку ответа, «Главное» — на главных произведениях', () => {
    const { container } = render(<AuthorBooks lang="ru" author={fullAuthor()} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Лев Толстой: книги на Bibliaris' })
    ).toBeInTheDocument();
    const titles = Array.from(container.querySelectorAll('article')).map(
      (a) => a.querySelector('a[href^="/ru/book/"]:not([tabindex])')?.getAttribute('href') ?? ''
    );
    expect(titles[0]).toContain('voyna-i-mir');
    expect(titles[1]).toContain('anna-karenina');
    expect(screen.getAllByText('Главное')).toHaveLength(2);
  });

  it('книга не из главных — без ленты', () => {
    render(<AuthorBooks lang="ru" author={fullAuthor({ notableWorks: [] })} />);

    expect(screen.queryByText('Главное')).not.toBeInTheDocument();
  });

  it('все книги уже показаны — кнопки «Показать все» нет', () => {
    render(<AuthorBooks lang="ru" author={fullAuthor()} />);

    expect(screen.queryByRole('button', { name: 'Показать все' })).not.toBeInTheDocument();
  });

  it('книг больше порции — «Показать все» догружает остальные без повторов', async () => {
    const all = [...twelve, authorBook({ id: 'b12', slug: 'book-12', title: 'Книга 12' })];
    cardsSpy.mockResolvedValue({
      items: all,
      pagination: { page: 1, limit: 48, total: 13, totalPages: 1 },
    });
    withClient(
      <AuthorBooks
        lang="ru"
        author={minimalAuthor({ books: twelve, booksTotal: 13, notableWorks: [] })}
      />
    );

    expect(cardsSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Показать все' }));

    await screen.findAllByText('Книга 12');
    expect(cardsSpy).toHaveBeenCalledTimes(1);
    expect(cardsSpy).toHaveBeenCalledWith('ru', 'lev-tolstoy', 1, 48);
    // Каждая книга — ровно одной карточкой: показанные 12 из догрузки отброшены по `id`.
    const hrefs = Array.from(document.querySelectorAll('article a[href^="/ru/book/"]'))
      .map((a) => a.getAttribute('href'))
      .filter((href) => !href?.endsWith('#audio'));
    const perCard = hrefs.filter((h) => h === '/ru/book/book-0').length;
    expect(document.querySelectorAll('article')).toHaveLength(13);
    for (let i = 0; i <= 12; i += 1) {
      expect(hrefs.filter((h) => h === `/ru/book/book-${i}`)).toHaveLength(perCard);
    }
    expect(screen.queryByRole('button', { name: 'Показать все' })).not.toBeInTheDocument();
  });

  it('догруженная книга из главных произведений получает ленту «Главное»', async () => {
    const extra = authorBook({ id: 'b12', slug: 'book-12', title: 'Книга 12' });
    cardsSpy.mockResolvedValue({
      items: [...twelve, extra],
      pagination: { page: 1, limit: 48, total: 13, totalPages: 1 },
    });
    withClient(
      <AuthorBooks
        lang="ru"
        author={minimalAuthor({
          books: twelve,
          booksTotal: 13,
          notableWorks: [
            {
              title: 'Книга 12',
              bookSlug: 'book-12',
              book: { slug: 'book-12', title: 'Книга 12', coverUrl: '' },
            },
          ],
        })}
      />
    );
    expect(screen.queryByText('Главное')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Показать все' }));

    expect(await screen.findByText('Главное')).toBeInTheDocument();
  });

  it('ответ насчитал книг больше, чем покрывают страницы от booksTotal, — догружает остальные', async () => {
    cardsSpy.mockImplementation((_lang: string, _slug: string, page: number) =>
      Promise.resolve({
        items: [authorBook({ id: `p${page}`, slug: `page-${page}`, title: `Стр ${page}` })],
        pagination: { page, limit: 48, total: 49, totalPages: 2 },
      })
    );
    withClient(<AuthorBooks lang="ru" author={minimalAuthor({ books: twelve, booksTotal: 48 })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Показать все' }));

    await screen.findAllByText('Стр 2');
    expect(cardsSpy.mock.calls.map((c) => c[2])).toEqual([1, 2]);
    // Обе страницы — по одной карточке: первая не потерялась и не задвоилась.
    const hrefs = Array.from(document.querySelectorAll('article a[href^="/ru/book/page-"]'))
      .map((a) => a.getAttribute('href'))
      .filter((href) => !href?.endsWith('#audio'));
    expect(new Set(hrefs)).toEqual(new Set(['/ru/book/page-1', '/ru/book/page-2']));
    expect(hrefs.filter((h) => h === '/ru/book/page-1')).toHaveLength(
      hrefs.filter((h) => h === '/ru/book/page-2').length
    );
  });

  it('сверх показанных книг не оказалось — пустой сетки нет, кнопка ушла', async () => {
    cardsSpy.mockResolvedValue({
      items: twelve,
      pagination: { page: 1, limit: 48, total: 12, totalPages: 1 },
    });
    const { container } = withClient(
      <AuthorBooks lang="ru" author={minimalAuthor({ books: twelve, booksTotal: 13 })} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Показать все' }));

    // Ни «Показать все», ни «Загрузка…»: догрузка закончилась.
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
    expect(document.querySelectorAll('article')).toHaveLength(12);
    // Под заголовком — только сетка показанных книг, без второй пустой.
    expect(container.querySelector('section')?.children).toHaveLength(2);
  });

  it('число страниц догрузки — от booksTotal по 48', async () => {
    cardsSpy.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 48, total: 100, totalPages: 3 },
    });
    withClient(
      <AuthorBooks lang="ru" author={minimalAuthor({ books: twelve, booksTotal: 100 })} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Показать все' }));

    await waitFor(() => expect(cardsSpy).toHaveBeenCalledTimes(3));
    expect(cardsSpy.mock.calls.map((c) => c[2])).toEqual([1, 2, 3]);
  });

  it('упавшая догрузка — ошибка и кнопка, неполный список не показывается', async () => {
    cardsSpy
      .mockResolvedValueOnce({
        items: twelve,
        pagination: { page: 1, limit: 48, total: 60, totalPages: 2 },
      })
      .mockRejectedValueOnce(new Error('500'));
    withClient(<AuthorBooks lang="ru" author={minimalAuthor({ books: twelve, booksTotal: 60 })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Показать все' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить книги');
    expect(screen.getByRole('button', { name: 'Показать все' })).toBeInTheDocument();
  });

  it('книг нет — блока нет вовсе (решение арбитра 15.10.2026, `F02 | F02-3`, Р12)', () => {
    const { container } = render(
      <AuthorBooks lang="ru" author={minimalAuthor({ books: [], booksTotal: 0 })} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
