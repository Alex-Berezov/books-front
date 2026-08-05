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

  it('lets the editorial switches veto an auto-indexable term', () => {
    expect(isTaxonomyLinkable({ isVisible: false, autoIndexable: true })).toBe(false);
    expect(isTaxonomyLinkable({ indexable: false, autoIndexable: true })).toBe(false);
  });

  it('treats a missing term as not linkable', () => {
    expect(isTaxonomyLinkable(null)).toBe(false);
    expect(isTaxonomyLinkable(undefined)).toBe(false);
  });
});
