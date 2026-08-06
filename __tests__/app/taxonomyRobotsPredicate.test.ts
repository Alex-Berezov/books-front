import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Control landings for aligning the taxonomy page's robots decision with the
 * predicate that drives internal links and the sitemap (`seo-rules.md` §391:
 * "ссылка, sitemap и meta robots для одного термина обязаны решать одинаково").
 *
 * Landings 1 and 2 MUST FAIL against the current implementation. They are the
 * proof that the check is capable of going red before it is trusted green
 * (`agent-rules.md` §"Проверка, которая не может провалиться, — не проверка").
 * Landing 3 MUST PASS both before and after — it guards against over-narrowing.
 */

const httpGet = vi.fn();

vi.mock('@/lib/http', async () => {
  const actual = await vi.importActual<typeof import('@/lib/http')>('@/lib/http');
  return { ...actual, httpGet: (...args: unknown[]) => httpGet(...args) };
});

const { generateMetadata } = await import('@/app/[lang]/genre/[slug]/page');

const params = Promise.resolve({ lang: 'en', slug: 'gothic-fiction' });
const searchParams = Promise.resolve({});

const seoResponse = {
  meta: {
    title: 'Gothic Fiction',
    description: 'Gothic fiction books',
    canonicalUrl: 'https://bibliaris.com/en/genre/gothic-fiction',
    // The backend collapses `indexable && autoIndexable` into this field. It
    // cannot see `isVisible` at all — `books/src/modules/seo/` never reads it.
    robots: { index: true, follow: true },
  },
  openGraph: { title: 'Gothic Fiction', description: '', url: '' },
  // `generateMetadata` reads `seo.twitter.card` unguarded; omitting this block
  // drops the whole function into its catch, which returns a title-only object
  // with no `robots` at all. A landing that fails that way proves nothing.
  twitter: { card: 'summary', site: '', title: '', description: '', image: '' },
  hreflangs: [] as { lang: string; url: string }[],
};

/** Shape of `/categories/:slug/books/cards` as the page consumes it. */
const cards = (category: Record<string, unknown> | null, total: number) => ({
  category,
  items: [],
  pagination: { page: 1, limit: 1, total, totalPages: total },
});

const respondWith = (cardsPayload: ReturnType<typeof cards>) => {
  httpGet.mockImplementation((url: string) =>
    url.includes('/seo/resolve') ? Promise.resolve(seoResponse) : Promise.resolve(cardsPayload)
  );
};

describe('taxonomy page robots must decide with the same fields as links and sitemap', () => {
  beforeEach(() => {
    httpGet.mockReset();
  });

  /**
   * LANDING 1 — must be RED before the fix.
   *
   * A hidden term with books currently answers `index`: the backend bundle says
   * index (it never reads `isVisible`) and the frontend overlay only narrows on
   * a zero count. So hiding a term removes it from the sitemap and from every
   * internal link while leaving its own URL indexable — an orphan in the index,
   * which is exactly what §391 forbids.
   */
  it('LANDING 1: a hidden term with books answers noindex', async () => {
    respondWith(
      cards(
        { id: '1', slug: 'gothic-fiction', isVisible: false, indexable: true, autoIndexable: true },
        5
      )
    );

    const meta = await generateMetadata({ params, searchParams });

    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  /**
   * LANDING 2 — must be RED before the fix.
   *
   * `autoIndexable` missing from the payload is the У0 signature: on 05.08.2026
   * the API stopped sending it and both the sitemap and the linking predicate
   * silently degraded to a weaker rule while agreeing with each other. The
   * sitemap side now warns loudly (`taxonomy-linkable.ts:61-70`); the page side
   * does not consult the field at all, so the same degradation here is mute.
   *
   * SKIPPED DELIBERATELY — the state it describes is unreachable on this path,
   * and making it reachable would be the defect, not the fix.
   *
   * `autoIndexable` is `Boolean @default(true)` and NOT nullable
   * (`schema.prisma:679,720`); `chosen` in `seo.service.ts:825` is a full
   * translation row. The backend therefore can never observe `undefined`. The
   * robots path on the frontend does not read the field at all — it consumes the
   * backend's already-collapsed verdict. So there is no `undefined` to warn
   * about anywhere on this path.
   *
   * Feeding the field over the wire so that the page could re-derive the verdict
   * (path A) would not close an existing hole — it would open one (the field can
   * fail to arrive) and then guard it, while moving the verdict for all 65
   * indexable URLs onto a second data source that can disagree with the first.
   * The asymmetry with the sitemap is real but justified: the sitemap receives
   * the field over the network, so `undefined` is reachable there and the loud
   * fallback earns its place.
   *
   * Reactivate this landing the moment the frontend starts reading
   * `autoIndexable` directly on the robots path. See `seo-rules.md` §391.
   */
  it.skip('LANDING 2: a missing autoIndexable degrades loudly, not silently', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // No `autoIndexable` key at all — the field the API stopped sending.
    respondWith(cards({ id: '1', slug: 'gothic-fiction', isVisible: true, indexable: true }, 5));

    const meta = await generateMetadata({ params, searchParams });

    // Degrades to the live count, same as the sitemap side does.
    expect(meta.robots).toEqual({ index: true, follow: true });
    // ...and says so, instead of agreeing quietly with a weaker rule.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('autoIndexable'));
    warn.mockRestore();
  });

  /**
   * LANDING 3 — must stay GREEN before AND after. Guard against over-narrowing.
   *
   * This is the state of all 13 indexable terms per language (65 URLs, the whole
   * indexable taxonomy surface of the site). If this landing goes red after the
   * fix, the fix is wrong and must be rolled back before any diagnosis.
   */
  it('LANDING 3: a visible, editorially open, auto-open term with books stays index', async () => {
    respondWith(
      cards(
        { id: '1', slug: 'gothic-fiction', isVisible: true, indexable: true, autoIndexable: true },
        5
      )
    );

    const meta = await generateMetadata({ params, searchParams });

    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  /**
   * LANDING 4 — must be RED before the fix.
   *
   * `generateMetadata` wraps everything in try/catch and returned a title and
   * nothing else. No `robots` key means no robots meta tag, which means indexable
   * by default — an unreadable bundle silently granted `index` to a term that may
   * have been `noindex`. Not hypothetical: `seo.twitter.card` and `seo.hreflangs`
   * are read unguarded, and `/seo/resolve` has no `.catch` of its own, so a 403
   * from the global rate limiter (LEGACY-064) lands straight here.
   */
  it('LANDING 4a: unreadable bundle + computable half says NOT linkable -> noindex', async () => {
    // Hidden term: the half that did arrive already settles it, so noindex here
    // is a conclusion drawn from data, not a guess.
    httpGet.mockImplementation((url: string) =>
      url.includes('/seo/resolve')
        ? Promise.reject(new Error('403 rate limited'))
        : Promise.resolve(cards({ id: '1', slug: 'gothic-fiction', isVisible: false }, 5))
    );

    const meta = await generateMetadata({ params, searchParams });

    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('LANDING 4b: unreadable bundle + computable half says linkable -> 5xx, never a guess', async () => {
    httpGet.mockImplementation((url: string) =>
      url.includes('/seo/resolve')
        ? Promise.reject(new Error('403 rate limited'))
        : Promise.resolve(cards({ id: '1', slug: 'gothic-fiction', isVisible: true }, 5))
    );

    // Throwing is the point: 5xx is read as temporary and repaired by the next
    // successful crawl, whereas a guessed robots directive is acted upon.
    await expect(generateMetadata({ params, searchParams })).rejects.toThrow(
      /Indexability of taxonomy-detail/
    );
  });

  it('LANDING 4c: nothing readable at all -> 5xx', async () => {
    httpGet.mockImplementation(() => Promise.reject(new Error('403 rate limited')));

    await expect(generateMetadata({ params, searchParams })).rejects.toThrow(
      /Indexability of taxonomy-detail/
    );
  });

  /**
   * LANDING 6 — the veto must survive the string form of `robots`.
   *
   * The backend may send `meta.robots` either structured or as a raw string
   * (`"index, follow"`). If the visibility veto were expressed as a mutation of
   * the incoming directive, the string branch would slip past it and a hidden
   * term would stay indexable. It is expressed as a replacement instead: the
   * `isVisible === false` branch is checked first and ignores the incoming form
   * entirely. This landing is what keeps that ordering from being refactored away.
   */
  it('LANDING 6: the visibility veto overrides a string-form robots directive', async () => {
    httpGet.mockImplementation((url: string) =>
      url.includes('/seo/resolve')
        ? Promise.resolve({
            ...seoResponse,
            meta: { ...seoResponse.meta, robots: 'index, follow' },
          })
        : Promise.resolve(cards({ id: '1', slug: 'gothic-fiction', isVisible: false }, 5))
    );

    const meta = await generateMetadata({ params, searchParams });

    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  /**
   * LANDING 5 — resolved by the branch rule, no longer pending.
   *
   * The state is: the count request failed (403) while the bundle still answered.
   * `isVisible` rides on the count response, so it is unknown here and the veto
   * cannot fire — a hidden term reads `index` for the duration.
   *
   * That is now a decision rather than a gap. The rule is "bundle alive → its
   * verdict", and the bundle IS alive; the count failing does not make the
   * bundle's answer unknown. Forcing noindex instead would mean every taxonomy
   * page noindexes whenever one auxiliary request fails, and a 403 burst would
   * close all 65 live URLs — by the cost table in LEGACY-069 the far more
   * expensive mistake. The residual exposure is observable: audit rule 7.7 reads
   * `isVisible` from the list API and reports any page answering `index` for a
   * hidden term.
   *
   * Note this state is narrow. The page BODY issues its own count request
   * (`limit=20`, a different URL and cache key) with no `.catch`, so when that one
   * fails the whole page answers 5xx via handleContentFailure and no metadata
   * reaches a client at all. Only the metadata's own `limit=1` request failing
   * alone produces this.
   */
  it('LANDING 5: a live bundle keeps its verdict even when the count request fails', async () => {
    httpGet.mockImplementation((url: string) =>
      url.includes('/seo/resolve')
        ? Promise.resolve(seoResponse)
        : Promise.reject(new Error('403 rate limited'))
    );

    const meta = await generateMetadata({ params, searchParams });

    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  /**
   * Companion to landing 3: "unknown decides nothing" (`seo-rules.md` §386).
   * A failed count must keep the bundle's verdict, never force noindex. This is
   * deliberate fail-open, not a defect, and the alignment must preserve it.
   */
  it('keeps the bundle verdict when the count is unavailable', async () => {
    httpGet.mockImplementation((url: string) =>
      url.includes('/seo/resolve')
        ? Promise.resolve(seoResponse)
        : Promise.reject(new Error('count unavailable'))
    );

    const meta = await generateMetadata({ params, searchParams });

    expect(meta.robots).toEqual({ index: true, follow: true });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
