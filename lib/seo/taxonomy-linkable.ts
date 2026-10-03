/**
 * The single source of truth for "may the app link to this taxonomy term".
 *
 * A link may point only at a term that will answer `index`. The rule mirrors
 * the robots meta tag produced by the backend and the sitemap filter in
 * `app/sitemaps/[filename]/route.ts` — link, sitemap and meta robots are
 * required to decide identically. Anything that renders a taxonomy link must
 * go through this predicate instead of re-inventing a `booksCount > 0` check:
 * that threshold does not match the indexability threshold (hysteresis, closed
 * at <=2 books, open at >=5), which is why noindex pages leaked into internal
 * linking in the first place.
 */
export interface LinkableTerm {
  /** Editorial switch: term hidden from public lists. */
  isVisible?: boolean;
  /** Editorial switch: term excluded from indexing. */
  indexable?: boolean;
  /** Stored hysteresis state for the current language. May only narrow, never widen. */
  autoIndexable?: boolean;
  /** Live book count. The hard floor — a term with no books is never linkable. */
  booksCount?: number;
}

/**
 * The signals are combined with AND, deliberately: the live count is the floor
 * and the cached state can only narrow it further.
 *
 * An earlier version let `autoIndexable` win outright whenever it was present.
 * On 05.08.2026 that cost us production: the column had never been recomputed
 * and sat at its schema default of `true` for every term, so the moment the API
 * started returning it, the "cache" waved through 100% of the taxonomy —
 * including terms with zero books — and the sitemap advertised 2205 empty
 * pages. Under the rule below the same broken cache would have degraded to
 * "every non-empty term" instead of "everything".
 *
 * `booksCount` must therefore be the count for the language being rendered.
 * Passing a cross-language count weakens the floor without breaking it.
 */
/**
 * The missing-field fallback must not be silent.
 *
 * `autoIndexable` absent means the API is not sending it, and the predicate then
 * decides on the live count alone. That is a survivable degradation, not a
 * normal mode — and it is precisely what hid the У0 defect for months: both the
 * sitemap and the predicate quietly fell back to the same weaker rule and agreed
 * with each other while being equally wrong. Warned once per process, because
 * this runs per term on every render.
 */
let fallbackWarned = false;

export function resetTaxonomyFallbackWarning(): void {
  fallbackWarned = false;
}

export function isTaxonomyLinkable(term: LinkableTerm | null | undefined): boolean {
  if (!term) return false;
  if (term.isVisible === false) return false;
  if (term.indexable === false) return false;
  if ((term.booksCount ?? 0) <= 0) return false;

  if (term.autoIndexable === undefined) {
    if (!fallbackWarned) {
      fallbackWarned = true;
      console.warn(
        '[taxonomy-linkable] autoIndexable missing from the API response — ' +
          'falling back to booksCount alone. Linking and the sitemap are now ' +
          'deciding on a weaker signal than meta robots.'
      );
    }
    return true;
  }

  return term.autoIndexable;
}

/**
 * Editorial indexability of a term on one language: the term switch AND the `indexable` of that
 * language's translation (`LEGACY-422`, `T73`/`T74`/`T90`). For a tag the backend folds the
 * translation switch and `noindex` in the Robots field of its SEO record into it; for a category,
 * genre or collection only the Robots field (no switch of its own). One copy for the
 * sitemap/hreflang candidates, the book-page chips and the taxonomy overviews; the backend has its
 * own (`isTagTermOpen`/`isCategoryTermOpen`) and the two must decide alike.
 *
 * Compared with `!== false`, not truthiness: an absent field means open. `autoIndexable` is
 * deliberately not part of it: it is per translation and goes into `isTaxonomyLinkable` on its own.
 */
export function isTermTranslationIndexable(
  term: { indexable?: boolean } | null | undefined,
  translation: { indexable?: boolean } | null | undefined
): boolean {
  return term?.indexable !== false && translation?.indexable !== false;
}

/**
 * Linkable on one language, for a term that carries its own per-language projections
 * (`autoIndexable`, `booksCount` for the requested `?lang`) next to its translations — the taxonomy
 * overviews (`TaxonomyCardGrid`). The term switch and the folded `indexable` of the translation into
 * `lang` go through `isTermTranslationIndexable` (`LEGACY-422`, `T90`): for a category tree only the
 * translation carries the Robots field — the node flag stays editorial because the admin form sends it
 * back with PATCH.
 */
export function isTermLinkableIn(
  term: LinkableTerm & {
    translations?: Array<{ language: string; indexable?: boolean }>;
  },
  lang: string
): boolean {
  const translation = (term.translations ?? []).find((t) => t.language === lang);
  return isTaxonomyLinkable({
    isVisible: term.isVisible,
    indexable: isTermTranslationIndexable(term, translation),
    autoIndexable: term.autoIndexable,
    booksCount: term.booksCount,
  });
}
