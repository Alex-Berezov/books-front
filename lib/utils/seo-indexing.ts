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
