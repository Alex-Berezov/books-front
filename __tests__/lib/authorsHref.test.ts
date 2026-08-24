import { describe, it, expect } from 'vitest';
import {
  authorsBasePath,
  authorsHref,
  parseAuthorsQuery,
} from '@/components/public/authors/authors-href';

describe('authorsBasePath', () => {
  it('returns the hub path when there is no letter', () => {
    expect(authorsBasePath('ru', null)).toBe('/ru/authors');
  });

  it('returns the lower-cased, encoded letter path when there is a letter', () => {
    expect(authorsBasePath('ru', 'Д')).toBe('/ru/authors/letter/%d0%b4');
  });
});

describe('authorsHref', () => {
  it('writes no query string at all for the default query', () => {
    expect(authorsHref('ru', { page: 1, search: '', sort: 'name', letter: null })).toBe(
      '/ru/authors'
    );
  });

  it('preserves search, sort and page when they are not defaults', () => {
    const href = authorsHref('ru', { page: 3, search: 'дост', sort: 'books', letter: null });

    expect(href).toBe('/ru/authors?search=%D0%B4%D0%BE%D1%81%D1%82&sort=books&page=3');
  });
});

describe('parseAuthorsQuery', () => {
  it('falls back to defaults on garbage input', () => {
    expect(parseAuthorsQuery({ page: 'abc' }, null)).toMatchObject({ page: 1 });
    expect(parseAuthorsQuery({ page: '-5' }, null)).toMatchObject({ page: 1 });
    expect(parseAuthorsQuery({ sort: 'garbage' }, null)).toMatchObject({ sort: 'name' });
    expect(parseAuthorsQuery({}, null)).toMatchObject({ search: '' });
    expect(parseAuthorsQuery({ search: '  дост  ' }, null)).toMatchObject({ search: 'дост' });
  });

  it('takes the first element when a param arrives as an array', () => {
    expect(parseAuthorsQuery({ search: ['first', 'second'] }, null)).toMatchObject({
      search: 'first',
    });
    expect(parseAuthorsQuery({ sort: ['books', 'name'] }, null)).toMatchObject({ sort: 'books' });
  });

  /**
   * 🔴 Кодировка целиком в нижнем регистре, включая процентные пары.
   *
   * `encodeURIComponent('д')` даёт `%D0%B4` — с заглавными `D` и `B`. Middleware
   * редиректит любой путь, где есть `[A-Z]`, а `pathname` процентные
   * последовательности не декодирует: все двадцать девять русских буквенных
   * адресов получали постоянный 301, и canonical указывал на редирект.
   * В индекс такие страницы не попадали вовсе.
   */
  it('encodes the letter entirely in lower case, percent pairs included', () => {
    const href = authorsBasePath('ru', 'Д');

    expect(href).toBe('/ru/authors/letter/%d0%b4');
    expect(/[A-Z]/.test(href)).toBe(false);
  });

  it('leaves no upper case in any Russian letter address', () => {
    for (const letter of 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ') {
      expect(/[A-Z]/.test(authorsBasePath('ru', letter))).toBe(false);
    }
  });

  it('decodes back to the same letter regardless of the encoding case', () => {
    expect(decodeURIComponent(authorsBasePath('ru', 'Д'))).toBe('/ru/authors/letter/д');
  });

  it('caps the search term at the length the backend accepts', () => {
    const long = 'я'.repeat(150);
    expect(parseAuthorsQuery({ search: long }, null).search).toHaveLength(100);
  });

  it('caps an absurd page number instead of passing it through', () => {
    expect(parseAuthorsQuery({ page: '99999999999999999999' }, null).page).toBe(10_000);
  });
});
