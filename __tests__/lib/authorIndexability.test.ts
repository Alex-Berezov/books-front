import { describe, expect, it } from 'vitest';
import { isAuthorLinkable } from '@/lib/seo/author-linkable';
import { buildRobotsByCount, toCountResult } from '@/lib/utils/seo-indexing';

/**
 * `books-app-docs/tasks/authors-indexability/TASK.md`.
 *
 * Авторы были единственным публичным типом страниц, целиком выпавшим из контура
 * «ссылка = sitemap = robots»: `sitemap-authors-en.xml` перечислял 10 URL из 10,
 * а страница автора без единой опубликованной книги отдавала `index, follow`
 * наравне с наполненной.
 *
 * Здесь проверяется именно **решение о видимости**, а не разметка страницы:
 * ровно оно и было неверным, и ровно оно способно навредить — `200 + noindex`
 * Google исполняет, и возвращается страница неделями.
 */
describe('author indexability verdict', () => {
  const verdict = (books: number | null) => buildRobotsByCount(toCountResult(books), false);

  it('keeps an author with books indexable', () => {
    expect(verdict(1)).toEqual({ index: true, follow: true });
  });

  // 🔴 Сам смысл задачи: тонкая страница закрывается.
  it('closes an author with no published books', () => {
    expect(verdict(0)).toEqual({ index: false, follow: true });
  });

  /**
   * 🔴 Инвариант из `seo-rules.md`: сбой подсчёта — не «книг нет».
   *
   * `undefined` означает «тега robots не выставлять вовсе», то есть страница
   * остаётся индексируемой по умолчанию. Асимметрия намеренная: отсутствие тега
   * на время сбоя бэкенда не стоит ничего, а ошибочный noindex стоит недель.
   */
  it('does not treat an unknown count as zero', () => {
    expect(verdict(null)).toBeUndefined();
  });
});

/**
 * Фильтр карты сайта. Отдельно от вердикта robots, потому что это второй из трёх
 * сигналов, а `seo-rules.md` требует, чтобы все три решали про один объект
 * одинаково — расхождение и есть дефект, а не его следствие.
 */
describe('isAuthorLinkable', () => {
  it('keeps an author with books', () => {
    expect(isAuthorLinkable({ booksCount: 1 })).toBe(true);
  });

  // 🔴 До 09.08.2026 фильтровалось только наличие слага, и авторы без книг
  // лежали в карте сайта наравне с остальными.
  it('drops an author with no books', () => {
    expect(isAuthorLinkable({ booksCount: 0 })).toBe(false);
  });

  /**
   * ⚠️ Та же асимметрия, что у `buildRobotsByCount`: неизвестность нулём не
   * считается. Счётчик, которого нет в ответе, — это «выяснить не удалось»,
   * а не «книг нет».
   */
  it('keeps an author whose count is unknown', () => {
    expect(isAuthorLinkable({})).toBe(true);
    expect(isAuthorLinkable({ booksCount: null })).toBe(true);
  });

  /**
   * 🔴 Согласованность двух сигналов — то, ради чего задача и заведена: список
   * говорил «0 книг», страница показывала книгу. Ноль обязан означать одно и то
   * же для карты сайта и для robots, иначе в индексе появляется сирота.
   */
  it('agrees with the robots verdict on the same input', () => {
    for (const booksCount of [0, 1, 5]) {
      const inSitemap = isAuthorLinkable({ booksCount });
      const indexable = buildRobotsByCount(toCountResult(booksCount), false)?.index;
      expect(inSitemap).toBe(indexable);
    }
  });
});
