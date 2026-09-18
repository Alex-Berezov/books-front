// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * LEGACY-007, решение владельца 18.09.2026 (вариант C): `copyrightStatus` — значение
 * из семейства `APPROVED*`, а не переведённая метка, и страница книги показывала его
 * анониму сырым. Публичный рендер снят.
 *
 * ⚠️ Границы сторожа, чтобы он не читался как больше, чем есть. Он стережёт **разметку**,
 * а не выдачу. Поле по тому же решению остаётся в ответе API (белый список
 * `books/src/common/selects/public-book.select.ts`) и уезжает в RSC-payload страницы
 * пропсами клиентских компонентов, которым `activeVersion` передаётся целиком. Читатель
 * его не видит, из исходника страницы оно достаётся. Сузить это — отдельная работа,
 * границами записи она не покрыта.
 *
 * Страница — асинхронный серверный компонент с сетевыми запросами, рендер-тест потребовал бы
 * мокать весь слой данных ради одного условного блока. Сторож поэтому сканирует исходник —
 * тот же приём, что и `__tests__/eslintInlineStyles.test.ts`.
 */

const LOCALES = ['en', 'es', 'fr', 'pt', 'ru'] as const;

const readRepoFile = (relativePath: string): string =>
  readFileSync(resolve(__dirname, '../..', relativePath), 'utf8');

describe('LEGACY-007: copyrightStatus is off the public book page', () => {
  it('is not rendered by the book page', () => {
    expect(readRepoFile('app/[lang]/book/[slug]/page.tsx')).not.toContain('copyrightStatus');
  });

  it.each(LOCALES)('has no leftover book.copyrightStatus label in %s.json', (lang) => {
    const dictionary = JSON.parse(readRepoFile(`lib/i18n/locales/${lang}.json`)) as {
      book?: Record<string, unknown>;
    };

    expect(dictionary.book).toBeDefined();
    expect(dictionary.book).not.toHaveProperty('copyrightStatus');
  });
});
