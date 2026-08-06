/**
 * Rule 7.7 of the SEO audit, kept apart from the runner so it can be tested.
 *
 * `seo-rules.md` §391 requires link, sitemap and meta robots to decide alike for
 * one term, but they reach the verdict by different routes: the page consumes an
 * already collapsed `seo.meta.robots` from the backend plus two narrowing
 * overlays, while `isTaxonomyLinkable` reads four fields directly. The collapsed
 * verdict hides which fields produced it, so a change to the backend predicate
 * would drift apart from the frontend silently — and no unit test in either
 * repository would notice, because each side stays individually correct.
 *
 * This is the alternative to duplicating `autoIndexable` into the page: it
 * catches drift wherever it originates and needs no synchronised deploy.
 */

/**
 * The linking predicate, kept in step with `lib/seo/taxonomy-linkable.ts` by hand.
 *
 * Deliberately NOT imported from the application. The audit has to be able to
 * disagree with the code it audits; sharing the module would make a bug inside it
 * invisible, because both sides would then be wrong in the same direction. That
 * is exactly how У0 survived — the sitemap and the predicate fell back to the
 * same weaker rule and agreed with each other while both were wrong.
 *
 * If this drifts from the real predicate, 7.7 starts reporting false positives —
 * loudly. That is the intended failure direction.
 */
export const linkablePredicate = ({ isVisible, indexable, autoIndexable, booksCount }) => {
  if (isVisible === false) return false;
  if (indexable === false) return false;
  if ((booksCount ?? 0) <= 0) return false;
  return autoIndexable === undefined ? true : autoIndexable;
};

const isNoindexContent = (robots) => !!robots && /noindex/i.test(robots);

/**
 * Share of the terms it set out to judge that the rule must actually reach.
 *
 * Without a floor, an outage that swallows the sample turns "0 violations" into
 * a statement about nothing — indistinguishable from a clean run, and quietest
 * exactly when the site is worst (`agent-rules.md` §"Проверка обязана отличать
 * «сломано» от «занято»", point 4).
 */
export const MIN_JUDGED_RATIO = 0.75;

/**
 * Compare each term's rendered robots against the predicate's verdict.
 *
 * A page that did not answer 200 is **skipped, not judged**: 7.4 and the
 * INCONCLUSIVE guard already speak about broken addresses, and 7.7 must not turn
 * an outage into a contract violation.
 *
 * Disagreements come back as `suspects`, not findings. Since LEGACY-069 a page
 * whose SEO bundle could not be read answers `200 + noindex` — deliberately —
 * and from outside that is indistinguishable from real drift. The caller re-reads
 * each suspect once before believing it; only a disagreement that survives the
 * second read is a finding.
 *
 * @returns `{ suspects, judged, skipped }` — counts included so the caller can
 *   refuse to conclude anything from a run that reached too few pages.
 */
export function findVerdictDrift(terms, pages) {
  const suspects = [];
  let judged = 0;
  let skipped = 0;

  for (const term of terms) {
    const page = pages.get(term.url);
    if (!page) continue; // never asked for — outside the control sample
    if (page.status !== 200) {
      skipped += 1;
      continue;
    }
    judged += 1;
    const pageSaysIndex = !isNoindexContent(page.robots);
    if (pageSaysIndex === term.expected) continue;
    suspects.push({ term, pageSaysIndex });
  }

  return { suspects, judged, skipped };
}

/** Render a confirmed disagreement into a finding row. */
export function describeDrift({ term, pageSaysIndex }) {
  const f = term.fields;
  return {
    url: term.url,
    problem:
      `verdict drift: page says ${pageSaysIndex ? 'index' : 'noindex'}, ` +
      `linking predicate says ${term.expected ? 'index' : 'noindex'} ` +
      `(${term.type}/${term.lang}: isVisible=${f.isVisible} indexable=${f.indexable} ` +
      `autoIndexable=${f.autoIndexable} booksCount=${f.booksCount})`,
  };
}

/** Did the run reach enough pages for its silence to mean anything? */
export function judgedEnough(judged, intended) {
  if (intended === 0) return false;
  return judged >= Math.ceil(intended * MIN_JUDGED_RATIO);
}
