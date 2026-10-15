import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthorHero } from '@/components/public/author/AuthorHero/AuthorHero';
import { authorBook, fullAuthor, minimalAuthor } from '../../../fixtures/author-page';

/** F02-3, `product.md` §4: шапка страницы автора. */
describe('AuthorHero', () => {
  it('полный автор: имя, родное имя, годы, строка «кто это», подпись портрета ссылками', () => {
    const { container } = render(<AuthorHero lang="ru" author={fullAuthor()} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Лев Толстой' })).toBeInTheDocument();
    expect(screen.getByText('Лев Николаевич Толстой')).toBeInTheDocument();
    expect(screen.getByText('1828 — 1910')).toBeInTheDocument();
    expect(screen.getByText(fullAuthor().tagline as string)).toBeInTheDocument();
    const caption = container.querySelector('figcaption');
    expect(caption).toHaveTextContent('Фото: Сергей Прокудин-Горский, Public domain');
    expect(screen.getByRole('link', { name: 'Public domain' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/publicdomain/mark/1.0/'
    );
    expect(screen.getByRole('link', { name: 'commons.wikimedia.org' })).toBeInTheDocument();
  });

  it('родное имя, совпадающее с именем страницы, не повторяется', () => {
    render(<AuthorHero lang="ru" author={fullAuthor({ nativeName: 'Лев Толстой' })} />);

    expect(screen.getAllByText('Лев Толстой')).toHaveLength(1);
  });

  // 🔴 Агрегаты — по всем книгам (решение арбитра 14.10.2026, `F02 | F02-1`): у книг порции нет
  // ни аудио, ни оценок, а у автора они есть — за пределами первых 12.
  it('счётчики — booksTotal и агрегаты ответа, а не показанная порция', () => {
    render(
      <AuthorHero
        lang="ru"
        author={fullAuthor({
          booksTotal: 13,
          booksHasAudio: true,
          booksAvgRating: 3,
          books: [authorBook({ hasAudio: false, rating: null })],
        })}
      />
    );

    expect(screen.getByText(/^13\s+книг/)).toBeInTheDocument();
    expect(screen.getByText('Доступны аудиокниги')).toBeInTheDocument();
    expect(screen.getByText(/★ 3\.0/)).toBeInTheDocument();
  });

  it('агрегаты «аудио нет» и «оценок нет» побеждают порцию', () => {
    render(
      <AuthorHero
        lang="ru"
        author={fullAuthor({
          booksHasAudio: false,
          booksAvgRating: null,
          books: [authorBook({ hasAudio: true, rating: 5 })],
        })}
      />
    );

    expect(screen.queryByText('Доступны аудиокниги')).not.toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it('ответ до F02-3 без агрегатов — по списку, как раньше', () => {
    render(
      <AuthorHero
        lang="ru"
        author={fullAuthor({
          booksHasAudio: undefined,
          booksAvgRating: undefined,
          books: [authorBook({ hasAudio: true, rating: 4 }), authorBook({ id: 'b2', rating: 5 })],
        })}
      />
    );

    expect(screen.getByText('Доступны аудиокниги')).toBeInTheDocument();
    expect(screen.getByText(/★ 4\.5/)).toBeInTheDocument();
  });

  // Ответ без `booksTotal` (бэкенд до F02-1) — счёт по длине списка, а не NaN и не пусто.
  it('без booksTotal счётчик — длина списка', () => {
    render(
      <AuthorHero
        lang="ru"
        author={fullAuthor({
          booksTotal: undefined,
          books: [authorBook(), authorBook({ id: 'b2' }), authorBook({ id: 'b3' })],
        })}
      />
    );

    expect(screen.getByText(/^3\s+книги/)).toBeInTheDocument();
  });

  it('минимальный автор: имя, заглушка портрета и счётчик — больше ничего', () => {
    const { container } = render(<AuthorHero lang="ru" author={minimalAuthor()} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Лев Толстой');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('figcaption')).toBeNull();
    expect(screen.getByText(/^1\s+книга/)).toBeInTheDocument();
    expect(container.querySelectorAll('p')).toHaveLength(0);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('0 книг — счётчика нет (решение арбитра 15.10.2026, `F02 | F02-3`, Р12)', () => {
    render(<AuthorHero lang="ru" author={minimalAuthor({ booksTotal: 0, books: [] })} />);

    expect(screen.queryByText(/книг/)).not.toBeInTheDocument();
  });

  it('без портрета подпись к фото не выводится, даже если задана', () => {
    const { container } = render(<AuthorHero lang="ru" author={fullAuthor({ photoUrl: null })} />);

    expect(container.querySelector('figcaption')).toBeNull();
  });

  // 🔴 `LEGACY-447`: адреса Википедии и Wikidata пишет контент-менеджер, в `href` — только http(s).
  it('не рендерит javascript: и рендерит соседнюю https-ссылку', () => {
    render(
      <AuthorHero
        lang="en"
        author={fullAuthor({
          wikipediaUrl: 'javascript:alert(1)',
          wikidataUrl: 'https://www.wikidata.org/wiki/Q7243',
        })}
      />
    );

    expect(screen.queryByRole('link', { name: /Wikipedia/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Wikidata/ })).toHaveAttribute(
      'href',
      'https://www.wikidata.org/wiki/Q7243'
    );
  });

  it('не рендерит блок ссылок, когда обе небезопасны; небезопасная лицензия — текстом', () => {
    render(
      <AuthorHero
        lang="en"
        author={fullAuthor({
          wikipediaUrl: 'javascript:alert(1)',
          wikidataUrl: 'data:text/html,x',
          photoCredit: { author: 'X', license: 'CC BY', licenseUrl: 'javascript:alert(1)' },
        })}
      />
    );

    expect(
      screen.queryByRole('link', { name: /Wikipedia|Wikidata|CC BY/ })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/CC BY/)).toBeInTheDocument();
  });
});
