import { describe, it, expect } from 'vitest';
import { deriveRightsSourceFromUrl, mayInferTextTypeFrom } from '@/lib/utils/rights-source-url';

/**
 * WP-M.1: разбор ссылки на фронте обязан совпадать с разбором бэкенда
 * (`books/src/modules/rights-intake/rights-intake-source-url.util.ts`): расхождение — это
 * разные значения в форме и в базе, и заметно оно только на живом интейке.
 */
describe('deriveRightsSourceFromUrl', () => {
  it('не разбирает пустое значение, мусор и не-HTTP схему', () => {
    expect(deriveRightsSourceFromUrl('')).toBeNull();
    expect(deriveRightsSourceFromUrl('   ')).toBeNull();
    expect(deriveRightsSourceFromUrl('не ссылка')).toBeNull();
    expect(deriveRightsSourceFromUrl('ftp://gutenberg.org/ebooks/932')).toBeNull();
  });

  it.each([
    ['https://www.gutenberg.org/ebooks/932', '932'],
    ['https://www.gutenberg.org/files/932/932-0.txt', '932'],
    ['https://gutenberg.org/cache/epub/932/pg932.txt', '932'],
    ['https://www.gutenberg.org/etext/932', '932'],
  ])('выводит номер книги Gutenberg из %s', (url, expected) => {
    expect(deriveRightsSourceFromUrl(url)).toEqual({
      provider: 'PROJECT_GUTENBERG',
      externalId: expected,
      providerHint: 'Project Gutenberg',
      kind: 'GUTENBERG',
    });
  });

  it('берёт заголовок страницы Викитеки как внешний ID и расшифровывает его', () => {
    expect(
      deriveRightsSourceFromUrl(
        'https://ru.wikisource.org/wiki/%D0%9F%D1%80%D0%B5%D1%81%D1%82%D1%83%D0%BF%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5_%D0%B8_%D0%BD%D0%B0%D0%BA%D0%B0%D0%B7%D0%B0%D0%BD%D0%B8%D0%B5_(%D0%94%D0%BE%D1%81%D1%82%D0%BE%D0%B5%D0%B2%D1%81%D0%BA%D0%B8%D0%B9)'
      )
    ).toEqual({
      provider: 'OTHER',
      externalId: 'Преступление_и_наказание_(Достоевский)',
      providerHint: 'Wikisource (ru)',
      kind: 'COMMUNITY_WIKI',
    });
  });

  it('узнаёт цифровые библиотеки', () => {
    expect(deriveRightsSourceFromUrl('https://archive.org/details/crimeandpunishm00dost')).toEqual({
      provider: 'OTHER',
      externalId: 'crimeandpunishm00dost',
      providerHint: 'Internet Archive',
      kind: 'DIGITAL_LIBRARY',
    });
    expect(
      deriveRightsSourceFromUrl(
        'https://standardebooks.org/ebooks/fyodor-dostoevsky/crime-and-punishment'
      )?.providerHint
    ).toBe('Standard Ebooks');
    expect(
      deriveRightsSourceFromUrl('https://babel.hathitrust.org/cgi/pt?id=uc1.b000123')?.externalId
    ).toBe('uc1.b000123');
  });

  it('даёт OTHER и хост незнакомой площадке, но не выдумывает внешний ID', () => {
    expect(deriveRightsSourceFromUrl('https://www.example.com/books/932')).toEqual({
      provider: 'OTHER',
      externalId: null,
      providerHint: 'example.com',
      kind: 'UNKNOWN_WEB',
    });
  });
});

describe('mayInferTextTypeFrom', () => {
  it('разрешает вывод типа текста только для узнанных площадок', () => {
    expect(
      mayInferTextTypeFrom(deriveRightsSourceFromUrl('https://www.gutenberg.org/ebooks/932'))
    ).toBe(true);
    expect(
      mayInferTextTypeFrom(deriveRightsSourceFromUrl('https://ru.wikisource.org/wiki/X'))
    ).toBe(true);
    expect(mayInferTextTypeFrom(deriveRightsSourceFromUrl('https://example.com/x'))).toBe(false);
    expect(mayInferTextTypeFrom(null)).toBe(false);
  });
});
