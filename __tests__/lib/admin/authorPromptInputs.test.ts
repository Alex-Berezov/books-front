import { describe, expect, it } from 'vitest';
import {
  buildPromptInputsText,
  PROMPT_AUTHORS_TRUNCATED_NOTE,
} from '@/lib/admin/author-prompt-inputs';
import { getSiteUrl } from '@/lib/seo/urls';
import type { AuthorPromptInputs } from '@/types/api-schema';

// Формат — раздел «Входные данные» `books-app-docs/features/F02-author-page/prompts/author-data.md`.

const inputs = (overrides: Partial<AuthorPromptInputs> = {}): AuthorPromptInputs => ({
  id: 'a1',
  birthDate: '1828-09-09',
  deathDate: '1910-11-20',
  names: [
    { lang: 'ru', name: 'Лев Толстой', slug: 'lev-tolstoy' },
    { lang: 'en', name: 'Leo Tolstoy', slug: 'leo-tolstoy' },
  ],
  books: [
    {
      lang: 'ru',
      items: [
        { title: 'Война и мир', slug: 'voyna-i-mir', firstPublishedYear: 1869, hasAudio: true },
      ],
      total: 1,
    },
    {
      lang: 'en',
      items: [
        {
          title: 'War and Peace',
          slug: 'war-and-peace',
          firstPublishedYear: 1869,
          hasAudio: false,
        },
        { title: 'Childhood', slug: 'childhood', firstPublishedYear: null, hasAudio: false },
      ],
      total: 3,
    },
  ],
  authors: [
    {
      names: [
        { lang: 'ru', name: 'Фёдор Достоевский', slug: 'fyodor-dostoevskiy' },
        { lang: 'en', name: 'Fyodor Dostoevsky', slug: 'fyodor-dostoevsky' },
      ],
    },
  ],
  authorsTruncated: false,
  ...overrides,
});

describe('buildPromptInputsText', () => {
  it('собирает текст ровно с заголовками раздела «Входные данные»', () => {
    expect(buildPromptInputsText(inputs())).toBe(
      [
        'Имя автора:',
        'en: Leo Tolstoy',
        'ru: Лев Толстой',
        '',
        'Даты жизни (если известны):',
        '1828-09-09 — 1910-11-20',
        '',
        'Книги этого автора на Bibliaris (по языкам: название — slug — год):',
        'en:',
        '- War and Peace — war-and-peace — 1869',
        '- Childhood — childhood',
        '(показано 2 из 3)',
        'ru:',
        '- Война и мир — voyna-i-mir — 1869',
        '',
        'Авторы на Bibliaris (имя — slug на каждом языке):',
        '- en: Fyodor Dostoevsky — fyodor-dostoevsky; ru: Фёдор Достоевский — fyodor-dostoevskiy',
        '',
        'Базовый домен:',
        getSiteUrl(),
      ].join('\n')
    );
  });

  it('год неизвестен — строка книги без года', () => {
    expect(buildPromptInputsText(inputs())).toContain('- Childhood — childhood\n');
  });

  it('обрезанный список авторов — предупреждение в тексте', () => {
    expect(buildPromptInputsText(inputs({ authorsTruncated: true }))).toContain(
      `fyodor-dostoevskiy\n${PROMPT_AUTHORS_TRUNCATED_NOTE}\n`
    );
    expect(buildPromptInputsText(inputs())).not.toContain(PROMPT_AUTHORS_TRUNCATED_NOTE);
  });

  it('даты не указаны и книг нет — так и пишется, без выдуманных значений', () => {
    const text = buildPromptInputsText(
      inputs({ birthDate: null, deathDate: null, books: [], authors: [] })
    );

    expect(text).toContain('Даты жизни (если известны):\nне указаны\n');
    expect(text).toContain('(по языкам: название — slug — год):\nкниг на сайте нет\n');
    expect(text).toContain('(имя — slug на каждом языке):\nавторов на сайте нет\n');
  });
});
