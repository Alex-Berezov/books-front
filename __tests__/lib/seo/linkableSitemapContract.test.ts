import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isTaxonomyLinkable,
  resetTaxonomyFallbackWarning,
  type LinkableTerm,
} from '@/lib/seo/taxonomy-linkable';

/**
 * WP-7.1 — link, sitemap and meta robots must decide identically.
 *
 * The sitemap route filters taxonomy entries with the very same predicate
 * (`app/sitemaps/[filename]/route.ts` calls `isTaxonomyLinkable(cat)` in all four
 * branches), so the contract is checked by asserting the predicate over the full
 * combination space. If a branch ever grows its own rule again — which is how
 * this whole phase started — the shapes below stop matching what the sitemap does
 * and the drift has to be reintroduced deliberately rather than by accident.
 */
const BOOK_COUNTS = [0, 1, 2, 3, 5];
const AUTO = [true, false, undefined];
const VISIBLE = [true, false, undefined];
const INDEXABLE = [true, false, undefined];

/** The rule, stated independently of the implementation. */
const expected = (term: LinkableTerm): boolean => {
  if (term.isVisible === false) return false;
  if (term.indexable === false) return false;
  if ((term.booksCount ?? 0) <= 0) return false;
  return term.autoIndexable ?? true;
};

describe('isTaxonomyLinkable — full combination space', () => {
  const cases: LinkableTerm[] = [];
  for (const booksCount of BOOK_COUNTS) {
    for (const autoIndexable of AUTO) {
      for (const isVisible of VISIBLE) {
        for (const indexable of INDEXABLE) {
          cases.push({ booksCount, autoIndexable, isVisible, indexable });
        }
      }
    }
  }

  it('covers every combination', () => {
    expect(cases).toHaveLength(5 * 3 * 3 * 3);
  });

  it.each(cases)('decides %j the same way the sitemap does', (term) => {
    expect(isTaxonomyLinkable(term)).toBe(expected(term));
  });

  it('never lets an editorial switch be overridden by a healthy count', () => {
    for (const booksCount of [1, 5, 100]) {
      expect(isTaxonomyLinkable({ booksCount, autoIndexable: true, isVisible: false })).toBe(false);
      expect(isTaxonomyLinkable({ booksCount, autoIndexable: true, indexable: false })).toBe(false);
    }
  });
});

/**
 * WP-7.1a — the test above passes on a broken contract too.
 *
 * If the backend stops sending `autoIndexable`, both the predicate and the
 * sitemap fall back to the live count and agree with each other while being
 * equally wrong. That is exactly how У0 survived for months, so the fallback is
 * required to announce itself.
 */
describe('missing autoIndexable is never silent', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetTaxonomyFallbackWarning();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('warns when the field is absent from the API response', () => {
    expect(isTaxonomyLinkable({ booksCount: 5 })).toBe(true);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('autoIndexable missing');
  });

  it('warns once per process, not once per term', () => {
    for (let i = 0; i < 50; i += 1) {
      isTaxonomyLinkable({ booksCount: 5 });
    }

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when the field is present, whatever its value', () => {
    isTaxonomyLinkable({ booksCount: 5, autoIndexable: true });
    isTaxonomyLinkable({ booksCount: 5, autoIndexable: false });
    isTaxonomyLinkable({ booksCount: 0, autoIndexable: false });

    expect(warn).not.toHaveBeenCalled();
  });
});
