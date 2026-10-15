import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuotesBlock } from '@/components/common/QuotesBlock/QuotesBlock';
import { AuthorStartHere } from '@/components/public/author/AuthorStartHere/AuthorStartHere';
import { toAuthorQuoteItems } from '@/lib/author/author-quotes';
import { fullAuthor } from '../../../fixtures/author-page';

/** F02-3: «С чего начать» (`product.md` §6) и цитаты со ссылкой на книгу (§10). */
describe('AuthorStartHere', () => {
  it('книги в порядке данных: название ссылкой на язык страницы и «почему с неё»', () => {
    const items = fullAuthor().startHere;
    render(<AuthorStartHere lang="ru" items={items} />);

    expect(screen.getByRole('heading', { level: 2, name: 'С чего начать' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Анна Каренина' })).toHaveAttribute(
      'href',
      '/ru/book/anna-karenina'
    );
    expect(screen.getByText(items[0].reason)).toBeInTheDocument();
  });

  it('пусто — блока нет', () => {
    const { container } = render(<AuthorStartHere lang="ru" items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('цитаты автора в общем QuotesBlock', () => {
  it('источник цитаты с книгой сайта — ссылкой, без книги — текстом', () => {
    const items = toAuthorQuoteItems('ru', [
      ...(fullAuthor().quotes ?? []),
      { text: 'Всё, что я знаю, я знаю потому, что люблю.', source: 'Дневник', book: null },
    ]);
    render(<QuotesBlock items={items} title="Цитаты" />);

    expect(screen.getByRole('link', { name: 'Анна Каренина' })).toHaveAttribute(
      'href',
      '/ru/book/anna-karenina'
    );
    expect(screen.getByText(/Дневник/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Дневник' })).not.toBeInTheDocument();
  });

  it('у книги без своей подписи источника — название книги; пустые цитаты отброшены', () => {
    expect(
      toAuthorQuoteItems('en', [
        { text: 'x', book: { slug: 'war', title: 'War and Peace', coverUrl: '' } },
        { text: '  ', book: null },
      ])
    ).toEqual([{ text: 'x', source: 'War and Peace', sourceHref: '/en/book/war' }]);
  });

  it('пусто — блока нет', () => {
    const { container } = render(<QuotesBlock items={toAuthorQuoteItems('ru', [])} />);

    expect(container).toBeEmptyDOMElement();
  });
});
