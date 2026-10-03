// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  isTaxonomyLinkable,
  isTermLinkableIn,
  isTermTranslationIndexable,
} from '@/lib/seo/taxonomy-linkable';

describe('isTaxonomyLinkable', () => {
  it('refuses a term the backend closed by hysteresis, even with books attached', () => {
    expect(isTaxonomyLinkable({ booksCount: 2, autoIndexable: false })).toBe(false);
  });

  it('respects an open term below the naive threshold instead of re-deciding', () => {
    expect(isTaxonomyLinkable({ booksCount: 2, autoIndexable: true })).toBe(true);
  });

  it('falls back to "has any books" when the backend sends no autoIndexable', () => {
    expect(isTaxonomyLinkable({ booksCount: 5 })).toBe(true);
    expect(isTaxonomyLinkable({ booksCount: 0 })).toBe(false);
    expect(isTaxonomyLinkable({})).toBe(false);
  });

  /**
   * Exact snapshot of the production state on 05.08.2026: every taxonomy
   * translation carried `autoIndexable: true` straight from the schema default
   * while holding no books at all. Under the previous composition the cache won
   * and the sitemap advertised 2205 empty pages. This test must fail on that
   * implementation.
   */
  it('never lets a cached true override a zero live count', () => {
    expect(isTaxonomyLinkable({ booksCount: 0, autoIndexable: true })).toBe(false);
    expect(isTaxonomyLinkable({ autoIndexable: true })).toBe(false);
  });

  it('lets the cache narrow a non-empty term but not widen an empty one', () => {
    expect(isTaxonomyLinkable({ booksCount: 4, autoIndexable: false })).toBe(false);
    expect(isTaxonomyLinkable({ booksCount: 4, autoIndexable: true })).toBe(true);
    expect(isTaxonomyLinkable({ booksCount: 4 })).toBe(true);
  });

  it('lets the editorial switches veto an auto-indexable term', () => {
    expect(isTaxonomyLinkable({ isVisible: false, autoIndexable: true })).toBe(false);
    expect(isTaxonomyLinkable({ indexable: false, autoIndexable: true })).toBe(false);
  });

  it('treats a missing term as not linkable', () => {
    expect(isTaxonomyLinkable(null)).toBe(false);
    expect(isTaxonomyLinkable(undefined)).toBe(false);
  });
});

describe('isTermTranslationIndexable (LEGACY-422, T74)', () => {
  it.each([
    [true, true, true],
    [false, true, false],
    [true, false, false],
    [false, false, false],
  ])('term %s, translation %s -> %s', (termFlag, translationFlag, expected) => {
    expect(
      isTermTranslationIndexable({ indexable: termFlag }, { indexable: translationFlag })
    ).toBe(expected);
  });

  it('treats an absent switch or an absent translation as open', () => {
    expect(isTermTranslationIndexable({}, undefined)).toBe(true);
    expect(isTermTranslationIndexable(undefined, null)).toBe(true);
    expect(isTermTranslationIndexable({ indexable: true }, {})).toBe(true);
  });

  it('a closed half closes the language even when the other half is missing', () => {
    expect(isTermTranslationIndexable({ indexable: false }, null)).toBe(false);
    expect(isTermTranslationIndexable(null, { indexable: false })).toBe(false);
  });
});

// `LEGACY-422`, `T90`: правило обзоров — флаг термина ∧ свёрнутый `indexable` перевода на язык.
describe('isTermLinkableIn (LEGACY-422, T90)', () => {
  const open = { isVisible: true, indexable: true, autoIndexable: true, booksCount: 9 };

  it.each([
    ['перевод на язык открыт', open, [{ language: 'en', indexable: true }], true],
    ['перевода на язык нет — решает термин', open, [{ language: 'ru', indexable: false }], true],
    ['переводы не пришли', open, undefined, true],
    ['перевод закрыт полем Robots', open, [{ language: 'en', indexable: false }], false],
    [
      'термин закрыт флагом',
      { ...open, indexable: false },
      [{ language: 'en', indexable: true }],
      false,
    ],
    ['автоматика закрыта', { ...open, autoIndexable: false }, [{ language: 'en' }], false],
    ['книг нет', { ...open, booksCount: 0 }, [{ language: 'en' }], false],
  ])('%s', (_name, term, translations, expected) => {
    expect(isTermLinkableIn({ ...term, translations }, 'en')).toBe(expected);
  });
});
