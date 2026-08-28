import { describe, expect, it } from 'vitest';
import { pluralize } from '@/components/public/authors/authors-plural';

const books = { one: 'книга', few: 'книги', many: 'книг' };
const enBooks = { one: 'book', few: 'books', many: 'books' };

/**
 * 🔴 Пара форм давала «2 авторов», «3 книг», «21 авторов» — неверную подпись
 * у каждого второго числа на русской странице.
 */
describe('pluralize', () => {
  it('uses the singular for 1, 21, 31, 101', () => {
    for (const count of [1, 21, 31, 101, 1001]) {
      expect(pluralize(count, 'ru', books)).toBe(books.one);
    }
  });

  it('uses the few form for 2-4, 22-24, 102-104', () => {
    for (const count of [2, 3, 4, 22, 23, 24, 102, 103, 104]) {
      expect(pluralize(count, 'ru', books)).toBe(books.few);
    }
  });

  it('uses the many form for 5-20, 25-30 and zero', () => {
    for (const count of [0, 5, 9, 10, 20, 25, 30, 100]) {
      expect(pluralize(count, 'ru', books)).toBe(books.many);
    }
  });

  // Одиннадцать-четырнадцать — исключение: «11 книг», а не «11 книга».
  it('uses the many form for 11-14, not the singular or the few form', () => {
    for (const count of [11, 12, 13, 14, 111, 112, 113, 114]) {
      expect(pluralize(count, 'ru', books)).toBe(books.many);
    }
  });

  it('keeps the two-form rule for the four other languages', () => {
    for (const lang of ['en', 'es', 'fr', 'pt'] as const) {
      expect(pluralize(1, lang, enBooks)).toBe(enBooks.one);
      for (const count of [0, 2, 5, 11, 21]) {
        expect(pluralize(count, lang, enBooks)).toBe(enBooks.many);
      }
    }
  });
});
