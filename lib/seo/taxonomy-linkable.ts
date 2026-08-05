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
export function isTaxonomyLinkable(term: LinkableTerm | null | undefined): boolean {
  if (!term) return false;
  if (term.isVisible === false) return false;
  if (term.indexable === false) return false;
  if ((term.booksCount ?? 0) <= 0) return false;
  return term.autoIndexable ?? true;
}
