import { describe, it, expect } from 'vitest';
import { canInferTextTypeFrom, deriveRightsSourceFromUrl } from '@/lib/utils/rights-source-url';

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

  /** Подмена якорных выражений на `includes` отдала бы чужому домену имя каталога с PD. */
  it.each([
    'https://notgutenberg.org/ebooks/932',
    'https://gutenberg.org.attacker.com/ebooks/932',
    'https://wikisource.org.evil.com/wiki/X',
    'https://web.archive.org/web/2020/https://example.com/details/x',
  ])('%s не считается узнанной площадкой', (url) => {
    const derived = deriveRightsSourceFromUrl(url);

    expect(derived?.kind).toBe('UNKNOWN_WEB');
    expect(derived?.provider).toBeNull();
    expect(derived?.externalId).toBeNull();
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

  it('узнаёт Gutenberg и без номера в адресе', () => {
    expect(deriveRightsSourceFromUrl('https://www.gutenberg.org/browse/scores/top')).toEqual({
      provider: 'PROJECT_GUTENBERG',
      externalId: null,
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

  it('в имени площадки называет только настоящий код языка раздела', () => {
    expect(deriveRightsSourceFromUrl('https://en.wikisource.org/wiki/Hamlet')?.providerHint).toBe(
      'Wikisource (en)'
    );
    expect(deriveRightsSourceFromUrl('https://wikisource.org/wiki/Main_Page')?.providerHint).toBe(
      'Wikisource'
    );
    expect(
      deriveRightsSourceFromUrl('https://commons.wikimedia.org/wiki/File:X.jpg')?.providerHint
    ).toBe('Wikimedia');
  });

  /** У поля `sourceExternalId` на бэкенде стоит `@MaxLength(100)`. */
  it('слишком длинный заголовок вики-страницы не подставляется вовсе', () => {
    const longTitle = 'Полное_собрание_сочинений_в_тридцати_томах_(Достоевский)/'.repeat(3);

    expect(
      deriveRightsSourceFromUrl(`https://ru.wikisource.org/wiki/${longTitle}`)?.externalId
    ).toBe(null);
  });

  it('без `/wiki/` в пути внешнего ID у Викитеки нет', () => {
    const derived = deriveRightsSourceFromUrl('https://ru.wikisource.org/w/index.php?title=X');

    expect(derived?.kind).toBe('COMMUNITY_WIKI');
    expect(derived?.externalId).toBeNull();
  });

  /** Статья Википедии и файл на Викискладе текстом произведения не являются. */
  it.each([
    'https://ru.wikipedia.org/wiki/Достоевский',
    'https://commons.wikimedia.org/wiki/File:X.jpg',
    'https://en.wikiquote.org/wiki/Hamlet',
  ])('%s не считается расшифровкой произведения', (url) => {
    const derived = deriveRightsSourceFromUrl(url);

    expect(derived?.kind).toBe('UNKNOWN_WEB');
    expect(derived?.provider).toBeNull();
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
        'https://standardebooks.org/ebooks/fyodor-dostoevsky/crime-and-punishment/text/single-page'
      )?.externalId
    ).toBe('fyodor-dostoevsky/crime-and-punishment');
    expect(
      deriveRightsSourceFromUrl('https://babel.hathitrust.org/cgi/pt?id=uc1.b000123')?.externalId
    ).toBe('uc1.b000123');
  });

  it('без идентификатора в адресе цифровая библиотека узнаётся, а ID остаётся пустым', () => {
    expect(deriveRightsSourceFromUrl('https://archive.org/search?query=x')?.externalId).toBeNull();
    expect(deriveRightsSourceFromUrl('https://babel.hathitrust.org/cgi/pt')?.externalId).toBeNull();
  });

  it('незнакомой площадке провайдера не назначает, но называет хост', () => {
    expect(deriveRightsSourceFromUrl('https://www.example.com/books/932')).toEqual({
      provider: null,
      externalId: null,
      providerHint: 'example.com',
      kind: 'UNKNOWN_WEB',
    });
  });
});

describe('canInferTextTypeFrom', () => {
  it('разрешает вывод типа текста только для площадок с текстами произведений', () => {
    expect(
      canInferTextTypeFrom(deriveRightsSourceFromUrl('https://www.gutenberg.org/ebooks/932'))
    ).toBe(true);
    expect(
      canInferTextTypeFrom(deriveRightsSourceFromUrl('https://ru.wikisource.org/wiki/X'))
    ).toBe(true);
    expect(canInferTextTypeFrom(deriveRightsSourceFromUrl('https://ru.wikipedia.org/wiki/X'))).toBe(
      false
    );
    expect(canInferTextTypeFrom(deriveRightsSourceFromUrl('https://example.com/x'))).toBe(false);
    expect(canInferTextTypeFrom(null)).toBe(false);
  });
});
