import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  availabilityFor,
  buildLetterAlternates,
  loadLettersByLang,
  type LettersByLang,
} from '@/components/public/authors/authors-letter-alternates';
import { countAuthors } from '@/components/public/authors/authors-page-data';
import type { AuthorsQuery } from '@/components/public/authors/authors-href';

const getAuthorLetters = vi.fn();
const getPublicAuthors = vi.fn();

vi.mock('@/api/endpoints/public', () => ({
  getAuthorLetters: (...args: unknown[]) => getAuthorLetters(...args),
  getPublicAuthors: (...args: unknown[]) => getPublicAuthors(...args),
}));

const SITE = 'https://bibliaris.com';

const byLang = (over: Record<string, Map<string, number> | null>): LettersByLang =>
  new Map(Object.entries(over));

describe('availabilityFor', () => {
  // 🔴 Отказ и «буквы нет» — разные ответы. Схлопни их в `false`, и языковая
  // альтернатива пропадёт на время сбоя, а вернуть её обратно стоит недель.
  it('tells a failed language apart from a language without the letter', () => {
    const availability = availabilityFor(
      'Д',
      byLang({
        ru: new Map([['Д', 12]]),
        en: new Map([['D', 4]]),
        es: null,
        fr: new Map([['Д', 0]]),
        pt: new Map(),
      })
    );

    expect(availability.get('ru')).toBe(true);
    expect(availability.get('en')).toBe(false);
    expect(availability.get('es')).toBeNull();
    expect(availability.get('fr')).toBe(false);
    expect(availability.get('pt')).toBe(false);
  });

  it('answers for every supported language, not only the ones that came back', () => {
    const availability = availabilityFor('A', byLang({ en: new Map([['A', 1]]) }));

    for (const lang of ['en', 'es', 'fr', 'pt', 'ru']) {
      expect(availability.has(lang)).toBe(true);
    }
  });
});

describe('buildLetterAlternates', () => {
  it('lists only the languages where the letter has authors', () => {
    const alternates = buildLetterAlternates(
      'Д',
      'ru',
      new Map([
        ['ru', true],
        ['en', false],
        ['es', null],
        ['fr', false],
        ['pt', false],
      ]),
      SITE
    );

    expect(alternates?.ru).toBe(`${SITE}/ru/authors/letter/%d0%b4`);
    expect(alternates?.en).toBeUndefined();
    // Отказ — не «оставим на всякий случай»: у букв алфавиты разные, и такая
    // альтернатива вела бы в гарантированный 404.
    expect(alternates?.es).toBeUndefined();
  });

  it('always keeps the own language of the page, whatever the availability says', () => {
    const alternates = buildLetterAlternates('Д', 'ru', new Map([['ru', false]]), SITE);

    expect(alternates?.ru).toBe(`${SITE}/ru/authors/letter/%d0%b4`);
  });

  /**
   * 🔴 Под `A` в английском может быть три страницы, а в испанском одна.
   * `hreflang="es"` на `?page=3` указал бы на страницу с пустой сеткой
   * и `noindex`, а hreflang на noindex обесценивает весь кластер.
   */
  it('claims no alternates at all from the second page on', () => {
    const availability = new Map([
      ['ru', true],
      ['en', true],
    ]);

    expect(buildLetterAlternates('Д', 'ru', availability, SITE, 1)).toBeDefined();
    expect(buildLetterAlternates('Д', 'ru', availability, SITE, 2)).toBeUndefined();
    expect(buildLetterAlternates('Д', 'ru', availability, SITE, 9)).toBeUndefined();
  });

  it('encodes the letter the same way the router does', () => {
    const alternates = buildLetterAlternates('Д', 'ru', new Map([['ru', true]]), SITE);

    expect(/[A-Z]/.test(alternates!.ru.replace(SITE, ''))).toBe(false);
  });
});

describe('loadLettersByLang', () => {
  beforeEach(() => {
    getAuthorLetters.mockReset();
  });

  it('asks every language once and keeps a failure as null', async () => {
    getAuthorLetters.mockImplementation((lang: string) =>
      lang === 'es'
        ? Promise.reject(new Error('502'))
        : Promise.resolve([{ letter: 'A', count: 3 }])
    );

    const result = await loadLettersByLang();

    expect(getAuthorLetters).toHaveBeenCalledTimes(5);
    expect(result.get('es')).toBeNull();
    expect(result.get('en')?.get('A')).toBe(3);
  });
});

/**
 * `countAuthors` — единственное место, где «не удалось выяснить» превращается
 * в решение об индексации. Подмена `null` на ноль дала бы `noindex` на живом
 * разделе, и поисковик исполнял бы его неделями.
 */
describe('countAuthors', () => {
  const query: AuthorsQuery = { page: 1, search: '', sort: 'name', letter: null };

  beforeEach(() => {
    getPublicAuthors.mockReset();
  });

  it('returns the total when the request succeeded', async () => {
    getPublicAuthors.mockResolvedValue({ data: [], meta: { total: 42 } });

    expect(await countAuthors('ru', query)).toBe(42);
  });

  it('returns null — not zero — when the request failed', async () => {
    getPublicAuthors.mockRejectedValue(new Error('503'));

    expect(await countAuthors('ru', query)).toBeNull();
  });

  it('returns null when the answer carried no total', async () => {
    getPublicAuthors.mockResolvedValue({ data: [], meta: {} });
    expect(await countAuthors('ru', query)).toBeNull();

    getPublicAuthors.mockResolvedValue({ data: [] });
    expect(await countAuthors('ru', query)).toBeNull();

    getPublicAuthors.mockResolvedValue({ data: [], meta: { total: '42' } });
    expect(await countAuthors('ru', query)).toBeNull();
  });

  it('counts zero as a real answer', async () => {
    getPublicAuthors.mockResolvedValue({ data: [], meta: { total: 0 } });

    expect(await countAuthors('ru', query)).toBe(0);
  });
});
