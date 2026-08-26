import { describe, expect, it } from 'vitest';
import { isOptimizableHost } from '@/components/public/authors/AuthorCard';
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

/**
 * Предикат решает, пойдёт ли фото через оптимизатор Next. На неразрешённом
 * хосте оптимизатор отвечает 400, а карточка серверная и `onError` в неё
 * не поставить — то есть портрет просто не появится.
 */
describe('isOptimizableHost', () => {
  it('accepts exactly the two static hosts of remotePatterns', () => {
    expect(isOptimizableHost('https://media.bibliaris.com/a.jpg')).toBe(true);
    expect(isOptimizableHost('https://api.bibliaris.com/a.jpg')).toBe(true);
  });

  it('rejects hosts the optimizer is not configured for', () => {
    // Викисклад — `.org`, и в `remotePatterns` его нет: такое фото рендерится
    // как есть, а не подменяется заглушкой.
    expect(isOptimizableHost('https://upload.wikimedia.org/a.jpg')).toBe(false);
    expect(isOptimizableHost('https://example.net/a.jpg')).toBe(false);
  });

  /**
   * 🔴 LEGACY-137. До 26.08.2026 предикат гласил `hostname.endsWith('.com')` — копию
   * шаблона `**.com` из `next.config.js`. Шаблон снят как открытый прокси;
   * возврат любой из двух форм роняет эту проверку.
   */
  it('does not accept a whole top-level zone', () => {
    expect(isOptimizableHost('https://example.com/a.jpg')).toBe(false);
    expect(isOptimizableHost('https://evil.com/a.jpg')).toBe(false);
    expect(isOptimizableHost('https://bibliaris.com.attacker.com/a.jpg')).toBe(false);
  });

  it('accepts http only on localhost', () => {
    expect(isOptimizableHost('http://localhost:3000/a.jpg')).toBe(true);
    expect(isOptimizableHost('http://media.bibliaris.com/a.jpg')).toBe(false);
  });

  it('treats a site-relative path as our own domain', () => {
    expect(isOptimizableHost('/uploads/a.jpg')).toBe(true);
  });

  it('rejects a string that is not a URL at all', () => {
    expect(isOptimizableHost('not a url')).toBe(false);
    expect(isOptimizableHost('')).toBe(false);
  });
});
