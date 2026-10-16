import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AUTHOR_ADAPTATIONS_LIMIT,
  AuthorAdaptations,
} from '@/components/public/author/AuthorAdaptations/AuthorAdaptations';
import { AuthorAwards } from '@/components/public/author/AuthorAwards/AuthorAwards';
import { AuthorFunFacts } from '@/components/public/author/AuthorFunFacts/AuthorFunFacts';
import { AuthorInfluences } from '@/components/public/author/AuthorInfluences/AuthorInfluences';
import { AuthorSimilar } from '@/components/public/author/AuthorSimilar/AuthorSimilar';
import { AuthorTimeline } from '@/components/public/author/AuthorTimeline/AuthorTimeline';
import { AUTHOR_PAGE_LIMITS } from '@/lib/admin/author-page-blocks';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { PublicAuthorAdaptation } from '@/types/api-schema';
import { fullAuthor } from '../../../fixtures/author-page';

/** F02-4, `product.md` §9, §11–§15: нижние блоки страницы автора на полных и пустых данных. */

const war = { slug: 'voyna-i-mir', title: 'Война и мир', coverUrl: '' };

describe('AuthorTimeline (§9)', () => {
  it('год — событие; книга сайта — ссылкой с иконкой, до н. э. — подписью', () => {
    const { container } = render(
      <AuthorTimeline
        lang="ru"
        events={[{ year: -428, text: 'Родился в Афинах.', book: null }, ...fullAuthor().timeline]}
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Хронология' })).toBeInTheDocument();
    expect(screen.getByText('428 до н. э.')).toBeInTheDocument();
    // Р11: весь текст события — ссылка на книгу; название книги отдельно не повторяется.
    const link = screen.getByRole('link', { name: 'Закончена «Война и мир».' });
    expect(link).toHaveAttribute('href', '/ru/book/voyna-i-mir');
    expect(link.closest('li')?.textContent).toBe('1869Закончена «Война и мир».');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    // Иконка — только у события со ссылкой на книгу сайта (решение арбитра, Р10).
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  // Р9: порядок внутри года — порядок ответа, фронт не пересортировывает.
  it('события одного года — в порядке данных', () => {
    render(
      <AuthorTimeline
        lang="ru"
        events={[
          { year: 1869, text: 'Б-событие', book: null },
          { year: 1869, text: 'А-событие', book: null },
        ]}
      />
    );

    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['1869Б-событие', '1869А-событие']);
  });

  it('событие без года или без текста (старые данные) не выводится', () => {
    render(
      <AuthorTimeline
        lang="ru"
        events={[
          { year: undefined as unknown as number, text: 'Без года', book: null },
          { year: 1852, text: 'Детство', book: null },
          { year: 1853, text: '   ', book: null },
        ]}
      />
    );
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['1852Детство']);
  });

  it('пусто — блока нет', () => {
    const { container } = render(<AuthorTimeline lang="ru" events={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('AuthorInfluences (§11)', () => {
  it('две колонки: автор сайта — ссылкой, иначе текстом', () => {
    render(
      <AuthorInfluences
        lang="ru"
        influences={{
          influencedBy: [{ name: 'Жан-Жак Руссо', author: null }],
          influenced: [
            {
              name: 'Чехов',
              authorSlug: 'anton-chekhov',
              author: { slug: 'anton-chekhov', name: 'Антон Чехов' },
            },
          ],
        }}
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Влияния' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Кто повлиял на автора',
      'На кого повлиял автор',
    ]);
    expect(screen.getByText('Жан-Жак Руссо').closest('a')).toBeNull();
    expect(screen.getByRole('link', { name: 'Антон Чехов' })).toHaveAttribute(
      'href',
      '/ru/author/anton-chekhov'
    );
  });

  it('одна колонка пустая — выводится только другая', () => {
    render(
      <AuthorInfluences
        lang="ru"
        influences={{ influencedBy: [], influenced: [{ name: 'Махатма Ганди', author: null }] }}
      />
    );

    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'На кого повлиял автор',
    ]);
  });

  it('обе пустые или null — блока нет', () => {
    const empty = render(
      <AuthorInfluences lang="ru" influences={{ influencedBy: [], influenced: [] }} />
    );
    expect(empty.container).toBeEmptyDOMElement();
    const none = render(<AuthorInfluences lang="ru" influences={null} />);
    expect(none.container).toBeEmptyDOMElement();
  });
});

describe('AuthorAwards (§12)', () => {
  it('год — название, номинация помечена; без года — без числа', () => {
    render(
      <AuthorAwards
        lang="ru"
        awards={[
          { name: 'Нобелевская премия по литературе', year: 1902, nomination: true },
          { name: 'Орден Святой Анны' },
          { name: '  ', year: 1900 },
        ]}
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Премии и награды' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    // Премия с пустым названием (старые данные) не выводится.
    expect(items).toHaveLength(2);
    const [first, second] = items;
    expect(first.textContent).toBe('1902 —Нобелевская премия по литературеноминация');
    expect(second.textContent).toBe('Орден Святой Анны');
  });

  it('пусто — блока нет', () => {
    const { container } = render(<AuthorAwards lang="ru" awards={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('AuthorAdaptations (§13)', () => {
  const item = (over: Partial<PublicAuthorAdaptation> = {}): PublicAuthorAdaptation => ({
    title: 'Война и мир',
    year: 1966,
    kind: 'film',
    book: null,
    ...over,
  });

  // Р7: книга сайта — её название ссылкой; иначе `basedOn` текстом; нет обоих — строки нет.
  it('«по книге» — три ветки', () => {
    render(
      <AuthorAdaptations
        lang="ru"
        adaptations={[
          item({ basedOn: 'Война и мир (роман)', book: war }),
          item({ title: 'Анна', year: undefined, kind: 'opera', basedOn: 'Анна Каренина' }),
          item({ title: 'Без книги', kind: 'other' }),
        ]}
      />
    );

    const [first, second, third] = screen.getAllByRole('listitem');
    expect(first.textContent).toBe('Война и мир (1966) — фильмпо книге Война и мир');
    expect(within(first).getByRole('link', { name: 'Война и мир' })).toHaveAttribute(
      'href',
      '/ru/book/voyna-i-mir'
    );
    expect(second.textContent).toBe('Анна — операпо книге Анна Каренина');
    expect(within(second).queryByRole('link')).toBeNull();
    expect(third.textContent).toBe('Без книги (1966) — другое');
  });

  it('вид вне словаря — «другое», а не сырой ключ', () => {
    render(
      <AuthorAdaptations
        lang="ru"
        adaptations={[item({ kind: 'musical' as unknown as PublicAuthorAdaptation['kind'] })]}
      />
    );
    expect(screen.getByRole('listitem').textContent).toBe('Война и мир (1966) — другое');
  });

  it('не больше 10 пунктов', () => {
    render(
      <AuthorAdaptations
        lang="ru"
        adaptations={Array.from({ length: 12 }, (_, i) => item({ title: `Фильм ${i}` }))}
      />
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(AUTHOR_ADAPTATIONS_LIMIT);
    // Предел страницы — тот же, что у формы и DTO: поднимут там — страница не обрежет молча.
    expect(AUTHOR_ADAPTATIONS_LIMIT).toBe(AUTHOR_PAGE_LIMITS.adaptations);
  });

  it.each(SUPPORTED_LANGS)('%s: у всех шести видов есть подпись', (lang) => {
    const kinds = getDictionary(lang).author.adaptationKind;
    for (const kind of ['film', 'series', 'animation', 'play', 'opera', 'other'] as const) {
      expect(kinds[kind]).toMatch(/\S/);
    }
  });

  it('пусто — блока нет', () => {
    const { container } = render(<AuthorAdaptations lang="ru" adaptations={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('AuthorFunFacts (§14)', () => {
  it('карточка — текст и источник ссылкой с названием', () => {
    render(<AuthorFunFacts lang="ru" facts={fullAuthor().funFacts} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Интересные факты' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Encyclopaedia Britannica' })).toHaveAttribute(
      'href',
      'https://www.britannica.com/biography/Leo-Tolstoy'
    );
  });

  // Защита на старые данные: импорт факт без источника не пропускает (`product.md` §14, §17).
  it('факт без годной ссылки не рендерится; все такие — блока нет', () => {
    const facts = [
      { text: 'Пустой адрес', sourceTitle: 'X', sourceUrl: '' },
      { text: 'Скрипт', sourceTitle: 'Y', sourceUrl: 'javascript:alert(1)' },
    ];
    const none = render(<AuthorFunFacts lang="ru" facts={facts} />);
    expect(none.container).toBeEmptyDOMElement();
    none.unmount();

    render(
      <AuthorFunFacts
        lang="ru"
        facts={[...facts, { text: 'Годный', sourceTitle: 'Z', sourceUrl: 'https://z.org/a' }]}
      />
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText('Скрипт')).toBeNull();
  });
});

describe('AuthorSimilar (§15)', () => {
  it('карточки: портрет, имя ссылкой, годы как в шапке; без перевода — без ссылки', () => {
    const { container } = render(
      <AuthorSimilar
        lang="ru"
        authors={[
          {
            name: 'Фёдор Достоевский',
            slug: 'fedor-dostoevskiy',
            photoUrl: 'https://media.bibliaris.com/authors/dostoevsky.jpg',
            birthDate: '1821-11-11',
            deathDate: '1881-02-09',
          },
          // Р8 F02-3: рождение старше 120 лет без смерти — «1828 — ?», а не «род. 1828».
          { name: 'Без смерти', slug: null, birthDate: '1828' },
        ]}
      />
    );

    const link = screen.getByRole('link', { name: /Фёдор Достоевский/ });
    expect(link).toHaveAttribute('href', '/ru/author/fedor-dostoevskiy');
    expect(link).toHaveTextContent('1821 — 1881');
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(screen.getByText('1828 — ?')).toBeInTheDocument();
    expect(screen.getByText('Без смерти').closest('a')).toBeNull();
  });

  it('пусто — блока нет', () => {
    const { container } = render(<AuthorSimilar lang="ru" authors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
