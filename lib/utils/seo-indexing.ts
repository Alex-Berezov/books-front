export function hasIndexableContent<T>(items: T[] | undefined | null): boolean {
  return Array.isArray(items) && items.length > 0;
}

export function buildRobotsByContent(hasContent: boolean): { index: boolean; follow: boolean } {
  return hasContent ? { index: true, follow: true } : { index: false, follow: true };
}

/**
 * How many items a page has — or that we could not find out.
 *
 * The distinction matters because the two states used to collapse into one:
 * `.catch(() => null)` followed by `?? 0` turned a failing API into a confident
 * "this page is empty".
 */
export type CountResult = { ok: true; total: number } | { ok: false };

/**
 * Robots directive for a page whose indexability depends on how much it holds.
 *
 * Returns `undefined` when the count is unknown — the caller then emits **no**
 * robots tag at all and the page stays indexable by default. That asymmetry is
 * deliberate: `200 + noindex` is a confident answer, and Google acts on it by
 * dropping the page; getting it back takes weeks. A missing robots tag during a
 * backend blip costs nothing in comparison. Fail towards keeping the page.
 */
export function buildRobotsByCount(
  count: CountResult,
  outOfRange: boolean
): { index: boolean; follow: boolean } | undefined {
  if (!count.ok) return undefined;
  return buildRobotsByContent(count.total > 0 && !outOfRange);
}

/** Narrow a fetch result to `CountResult`; `null` means the call failed. */
export function toCountResult(total: number | null | undefined): CountResult {
  return typeof total === 'number' ? { ok: true, total } : { ok: false };
}

/**
 * What the SEO bundle may carry in `meta.robots`. The backend sends either a
 * structured directive or a raw string (`"noindex, follow"`), and the pass-through
 * branch below must return whichever arrived, unmodified.
 */
type RobotsDirective = string | { index: boolean; follow: boolean };

/**
 * Editorial visibility, applied on top of whatever verdict was already reached.
 *
 * `seo-rules.md` §391 requires link, sitemap and meta robots to decide alike for
 * one term. They did not: `isTaxonomyLinkable` vetoes on `isVisible === false`
 * (`lib/seo/taxonomy-linkable.ts:57`) while the robots chain — the backend
 * bundle (`seo.service.ts:825`, reads `indexable` and `autoIndexable`) plus the
 * count overlay on the page — never reads the field at all. A hidden term with
 * books therefore left the sitemap and every internal link while its own URL
 * kept answering `index`: an orphan in the index, which is what §391 forbids.
 *
 * **This narrows and nothing else.** The only branch that changes anything fires
 * on `isVisible === false` and returns noindex; every other input is returned
 * untouched. A term with `isVisible !== false` cannot have its verdict altered
 * here — not by care, but because no path to it exists. That is what keeps the
 * 13 indexable terms per language (65 URLs, the whole indexable surface of the
 * site) structurally out of reach of this change.
 *
 * `undefined` in, `undefined` out: an unknown count still emits no robots tag
 * (§386 fail-open), and hiding is not a reason to start emitting one.
 */
export function applyEditorialVisibility<T extends RobotsDirective | undefined>(
  robots: T,
  isVisible: boolean | undefined
): T | { index: boolean; follow: boolean } {
  if (isVisible === false) return { index: false, follow: true };
  return robots;
}

/**
 * What a page must do when its SEO bundle could not be read at all.
 *
 * **`robots` is never derived from a `catch`.** An unreadable bundle is not
 * evidence about indexability, and guessing in either direction is wrong:
 * omitting `robots` grants `index` silently (the original defect), while forcing
 * `noindex` publishes a directive Google acts on for days or weeks. The cost is
 * asymmetric — a 5xx is read as temporary and repaired by the next successful
 * crawl at nearly zero cost, whereas recovering from a wrongly published
 * `noindex` means restoring 40 book and 65 taxonomy URLs by hand.
 *
 * So the branch depends on whether anything is independently known:
 *
 * - **Taxonomy** has a computable half — `isVisible` and the live count arrive on
 *   `/books/cards`, separately from the bundle. If that half already says "not
 *   linkable", `noindex` is a conclusion drawn from data, not a guess, and it is
 *   returned. If it says "linkable", the bundle was the only thing that could have
 *   narrowed it and its verdict is unknown → 5xx.
 * - **A book** has no computable half at all. Bundle unreadable → 5xx. Nothing else.
 *
 * A 404, or a bundle that arrives and is simply empty, is *data* — narrowing on it
 * is allowed. Only a transport failure counts as unknown.
 */
export class UnknownIndexabilityError extends Error {
  constructor(surface: string, slug?: string) {
    super(
      `Indexability of ${surface}${slug ? ` "${slug}"` : ''} is unknown: the SEO bundle ` +
        'could not be read and nothing independently computable narrows it. ' +
        'Answering 5xx rather than guessing a robots directive.'
    );
    this.name = 'UnknownIndexabilityError';
  }
}

/**
 * Resolve the robots directive when the bundle failed, for a surface that has an
 * independently computable predicate.
 *
 * @param linkable result of the linking predicate over data that did NOT come from
 *   the bundle, or `undefined` when that data is unavailable too.
 * @throws {UnknownIndexabilityError} when nothing narrows the verdict.
 */
export function robotsForUnreadableBundle(
  surface: string,
  linkable: boolean | undefined,
  slug?: string
): { index: boolean; follow: boolean } {
  if (linkable === false) return { index: false, follow: true };
  throw new UnknownIndexabilityError(surface, slug);
}

export function shouldNoindexPaginatedPage(
  requestedPage: number,
  totalItems: number,
  pageSize: number
): boolean {
  if (requestedPage <= 1) return false;
  if (totalItems === 0) return true;
  const totalPages = Math.ceil(totalItems / pageSize);
  return requestedPage > totalPages;
}
