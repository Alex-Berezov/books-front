import { describe, it, expect } from 'vitest';
import { isTaxonomyLinkable } from '@/lib/seo/taxonomy-linkable';

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
