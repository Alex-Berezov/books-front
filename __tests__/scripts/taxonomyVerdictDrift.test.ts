import { describe, it, expect } from 'vitest';
import * as verdict from '@/scripts/lib/taxonomy-verdict.mjs';

/** The four fields the predicate reads; every one of them may be absent. */
type TermFields = {
  isVisible?: boolean;
  indexable?: boolean;
  autoIndexable?: boolean;
  booksCount?: number;
};
type PageHead = { status: number; robots: string | null; canonical: string | null };
type Drift = { url: string; problem: string };

// The audit helper is plain `.mjs` with no declarations — deliberately, so that
// it stays readable as a script. Bind its exports through explicit signatures
// rather than letting inference widen every field to required.
const linkablePredicate = verdict.linkablePredicate as (f: TermFields) => boolean;
const findVerdictDrift = verdict.findVerdictDrift as (
  terms: Term[],
  pages: Map<string, PageHead>
) => { suspects: { term: Term; pageSaysIndex: boolean }[]; judged: number; skipped: number };
const describeDrift = verdict.describeDrift as (s: { term: Term; pageSaysIndex: boolean }) => Drift;
const judgedEnough = verdict.judgedEnough as (judged: number, intended: number) => boolean;

type Term = {
  lang: string;
  type: string;
  slug: string;
  url: string;
  fields: TermFields;
  expected: boolean;
};

const term = (fields: TermFields, url = 'https://bibliaris.com/en/genre/x'): Term => ({
  lang: 'en',
  type: 'genre',
  slug: 'x',
  url,
  fields,
  expected: linkablePredicate(fields),
});

const page = (robots: string | null, status = 200) => ({ status, robots, canonical: null });

/**
 * Control landing for audit rule 7.7 (`seo-audit.mjs`).
 *
 * A rule that only ever sees agreeing pairs passes by construction. These feed it
 * a deliberately disagreeing pair and require it to go red — the same reason the
 * rule itself fetches a control sample of non-indexable terms and not just the
 * indexable ones (`agent-rules.md` §"Проверка, которая не может провалиться").
 */
describe('audit rule 7.7 — verdict drift between page robots and the linking predicate', () => {
  it('CONTROL: reports a page that says index where the predicate says noindex', () => {
    // Hidden term with books: exactly the LEGACY-067 defect, as it looked live.
    const t = term({ isVisible: false, indexable: true, autoIndexable: true, booksCount: 5 });
    expect(t.expected).toBe(false);

    const { suspects } = findVerdictDrift([t], new Map([[t.url, page('index, follow')]]));
    const drift = suspects.map(describeDrift);

    expect(drift).toHaveLength(1);
    expect(drift[0].problem).toContain('page says index');
    expect(drift[0].problem).toContain('predicate says noindex');
    // All four fields must be in the row, or the finding cannot be acted on.
    expect(drift[0].problem).toContain('isVisible=false');
    expect(drift[0].problem).toContain('indexable=true');
    expect(drift[0].problem).toContain('autoIndexable=true');
    expect(drift[0].problem).toContain('booksCount=5');
  });

  it('CONTROL: reports the opposite drift too — noindex page, predicate says index', () => {
    const t = term({ isVisible: true, indexable: true, autoIndexable: true, booksCount: 5 });
    expect(t.expected).toBe(true);

    const { suspects } = findVerdictDrift([t], new Map([[t.url, page('noindex, follow')]]));
    const drift = suspects.map(describeDrift);

    expect(drift).toHaveLength(1);
    expect(drift[0].problem).toContain('page says noindex');
  });

  it('stays silent when the two agree — both index', () => {
    const t = term({ isVisible: true, indexable: true, autoIndexable: true, booksCount: 5 });
    expect(findVerdictDrift([t], new Map([[t.url, page(null)]])).suspects).toEqual([]);
  });

  it('stays silent when the two agree — both noindex', () => {
    const t = term({ isVisible: true, indexable: true, autoIndexable: false, booksCount: 5 });
    expect(findVerdictDrift([t], new Map([[t.url, page('noindex, follow')]])).suspects).toEqual([]);
  });

  /**
   * An outage must not be reported as a contract violation — that is the mistake
   * the audit made on 05.08 and 06.08 in two other forms.
   */
  it('judges nothing about a page that did not answer 200', () => {
    const t = term({ isVisible: false, indexable: true, autoIndexable: true, booksCount: 5 });
    const down = findVerdictDrift([t], new Map([[t.url, page(null, 503)]]));
    expect(down.suspects).toEqual([]);
    // ...and it must be counted as skipped, not silently as agreement.
    expect(down).toMatchObject({ judged: 0, skipped: 1 });
    expect(findVerdictDrift([t], new Map()).suspects).toEqual([]);
  });

  it('mirrors the application predicate on the cases that defined it', () => {
    // Cached true may not widen an empty term (the 2205-URL leak of 05.08).
    expect(linkablePredicate({ booksCount: 0, autoIndexable: true })).toBe(false);
    // Cached false narrows a non-empty one (hysteresis).
    expect(linkablePredicate({ booksCount: 4, autoIndexable: false })).toBe(false);
    // Missing field degrades to the live count, never to "indexable".
    expect(linkablePredicate({ booksCount: 4 })).toBe(true);
    expect(linkablePredicate({})).toBe(false);
    // Either editorial switch vetoes.
    expect(linkablePredicate({ isVisible: false, booksCount: 9, autoIndexable: true })).toBe(false);
    expect(linkablePredicate({ indexable: false, booksCount: 9, autoIndexable: true })).toBe(false);
  });
});

/**
 * Control landing for the sample floor.
 *
 * Rule 7.7 skips pages that did not answer 200, so an outage empties its sample
 * rather than failing it. Without a floor, "0 violations" from an empty sample
 * would read exactly like a clean run — and would be quietest precisely when the
 * site is worst (`agent-rules.md` §"Проверка обязана отличать «сломано» от
 * «занято»", point 4). A run over a dead target must come out INCONCLUSIVE.
 */
describe('audit rule 7.7 — a run that judged too little must not report "clean"', () => {
  const dead = (n: number) => {
    const terms = Array.from({ length: n }, (_, i) =>
      term(
        { isVisible: true, indexable: true, autoIndexable: true, booksCount: 5 },
        `https://bibliaris.com/en/genre/t${i}`
      )
    );
    const pages = new Map(terms.map((t) => [t.url, page(null, 503)]));
    return { terms, pages };
  };

  it('CONTROL: a target that is entirely down judges nothing and fails the floor', () => {
    const { terms, pages } = dead(20);

    const result = findVerdictDrift(terms, pages);

    expect(result.judged).toBe(0);
    expect(result.skipped).toBe(20);
    expect(result.suspects).toEqual([]);
    // Zero suspects, but the run proves nothing — the floor is what says so.
    expect(judgedEnough(result.judged, 20)).toBe(false);
  });

  it('CONTROL: a partial outage that swallows most of the sample also fails the floor', () => {
    const { terms, pages } = dead(20);
    // Ten answered, ten did not: half the sample is not enough to conclude.
    for (const t of terms.slice(0, 10)) pages.set(t.url, page(null));

    const result = findVerdictDrift(terms, pages);

    expect(result).toMatchObject({ judged: 10, skipped: 10 });
    expect(judgedEnough(result.judged, 20)).toBe(false);
  });

  it('lets a run with a healthy sample conclude', () => {
    const { terms, pages } = dead(20);
    for (const t of terms.slice(0, 16)) pages.set(t.url, page(null));

    expect(judgedEnough(findVerdictDrift(terms, pages).judged, 20)).toBe(true);
  });

  it('never concludes from an empty intention', () => {
    expect(judgedEnough(0, 0)).toBe(false);
  });
});
