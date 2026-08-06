/**
 * Every entry into a degraded SEO branch is counted and logged.
 *
 * The decision about what an unreadable dependency resolves to was made on an
 * *estimate* of how often it happens — the rate limiter's budget against the
 * cost of a crawl burst. Without this, that estimate never becomes a measurement
 * and nobody ever learns the real frequency. One line per entry, and a counter
 * that survives the request so a process can be asked how often it degraded.
 *
 * Deliberately `console.warn`, not `console.error`: these are expected, handled
 * states, and burying a real error among them would defeat both.
 */

export type DegradedSurface =
  | 'taxonomy-detail'
  | 'tag-detail'
  | 'book-detail'
  | 'sitemap-index'
  | 'sitemap-file';

export type DegradedReason =
  /** The SEO bundle could not be read at all (transport failure). */
  | 'bundle-unreadable'
  /** The count/content request could not be read, so the predicate is uncomputable. */
  | 'count-unreadable'
  /** Both are unknown — nothing can be decided. */
  | 'nothing-known'
  /** The bundle failed, but the independently computable part already says "not linkable". */
  | 'narrowed-by-predicate';

export interface DegradedEvent {
  surface: DegradedSurface;
  reason: DegradedReason;
  lang?: string;
  slug?: string;
  /** What the caller did about it — so the log says the outcome, not just the cause. */
  outcome: 'noindex' | 'threw-5xx' | 'kept-url';
}

const counters = new Map<string, number>();

export function noteDegraded(event: DegradedEvent): void {
  const key = `${event.surface}:${event.reason}:${event.outcome}`;
  const count = (counters.get(key) ?? 0) + 1;
  counters.set(key, count);

  console.warn(
    `[seo-degraded] surface=${event.surface} reason=${event.reason} ` +
      `outcome=${event.outcome} lang=${event.lang ?? '-'} slug=${event.slug ?? '-'} ` +
      `seen=${count}`
  );
}

/** Snapshot for tests and for anything that wants to report the totals. */
export function degradedCounters(): Record<string, number> {
  return Object.fromEntries(counters);
}

export function resetDegradedCounters(): void {
  counters.clear();
}
