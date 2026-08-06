#!/usr/bin/env node
/**
 * WP-7.2 / 7.4 / 7.6 — the live half of the "link = sitemap = robots" contract.
 *
 * The unit tests guard the code. This guards the *state*: У0 survived for months
 * with entirely correct code, because only the data moved. Nothing was committed
 * on the day the sitemap started advertising 2205 empty pages, so a check tied to
 * deployment alone would not have fired. Hence this runs both after every deploy
 * and on a daily schedule.
 *
 *   7.2  nothing indexable links to something non-indexable
 *   7.4  everything advertised is indexable and addressable
 *   7.6  everything advertised is reachable without executing JavaScript
 *
 * No sampling and no caps: the whole sitemap is a few hundred URLs across five
 * languages. A threshold would only create a second thing to get wrong.
 *
 * Two modes, because "after a deploy" and "on a quiet night" are different
 * questions. `--mode=smoke` checks a handful of addresses and that the hubs still
 * render their links; `--mode=full` (default) checks the whole contract.
 *
 * Usage:  node scripts/seo-audit.mjs [--base=https://bibliaris.com] [--mode=smoke|full]
 * Exit:   0 clean, 1 problems found, 2 the audit itself could not run.
 */

import { appendFileSync } from 'node:fs';

const BASE = (
  process.argv.find((a) => a.startsWith('--base='))?.slice('--base='.length) ||
  process.env.SEO_AUDIT_BASE_URL ||
  'https://bibliaris.com'
).replace(/\/$/, '');

const MODE =
  process.argv.find((a) => a.startsWith('--mode='))?.slice('--mode='.length) === 'smoke'
    ? 'smoke'
    : 'full';

const LANGS = ['en', 'ru', 'es', 'fr', 'pt'];
/**
 * Deliberately low. The first run of this script used 8 and reported 307
 * violations — every one of them an artefact: the site is a single container
 * serving force-dynamic pages that each fan out to the API, so the audit
 * overloaded the target and then blamed it. An audit that cannot tell "broken"
 * from "busy" is worse than none, because a daily alert nobody trusts is a
 * daily alert nobody reads.
 */
const CONCURRENCY = 1;
/**
 * Paced to stay under the API's rate limit, not merely to be polite.
 *
 * `GlobalRateLimitGuard` counts per client IP — and the whole site is one client
 * to the API, because every server-rendered page fetches from the same container.
 * Its default budget is 100 requests per 60s. At the previous 150 ms the audit
 * ran at ~400/min, sailed past the limit, collected 403s, and then reported the
 * pages as broken: the measuring instrument was manufacturing the fault it
 * measured. 750 ms is ~80/min — under the default with room to spare.
 */
const PACE_MS = 750;
/** Answers that mean "you were throttled", never "this page is broken". */
const THROTTLED = new Set([403, 429]);
/** A 5xx or a transport error is retried before it is believed. */
const ATTEMPTS = 3;
/** Above this share of failed fetches the run is not evidence about the site. */
const UNRELIABLE_RATIO = 0.1;

let transientFailures = 0;
/** Times the API told us to slow down. Reported as its own line, never as a defect. */
let throttled = 0;
let totalFetches = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Entry points crawled for internal links (7.2). */
const SEED_PATHS = ['', '/categories', '/genres', '/collections', '/tags', '/catalog'];

/**
 * Findings are keyed by the URL that is actually broken — one address, one row.
 *
 * The flat list this replaced counted the same address several times: once as a
 * linked page (7.2), once as a sitemap entry (7.4), and once per *referring* URL
 * when it appeared as an hreflang alternate. The 06.08 post-deploy run turned
 * ~25 momentarily failing addresses into "138 violations". Even after the cold
 * start is fixed, that arithmetic would make any single blip look like a
 * catastrophe, and a report nobody can read is a report nobody reads.
 */
const findings = new Map();

const note = (rule, url, problem, source) => {
  let entry = findings.get(url);
  if (!entry) {
    entry = { rules: new Set(), problems: new Set(), sources: new Set() };
    findings.set(url, entry);
  }
  entry.rules.add(rule);
  entry.problems.add(problem);
  if (source) entry.sources.add(source);
};

async function fetchText(url) {
  totalFetches += 1;
  let last = { status: 0, location: null, body: '' };

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, {
        redirect: 'manual',
        headers: { 'user-agent': 'bibliaris-seo-audit' },
      });
      const body = res.status >= 200 && res.status < 300 ? await res.text() : '';
      last = { status: res.status, location: res.headers.get('location'), body };
      // Being throttled says nothing about the page. It is also our own doing —
      // so it is counted apart from everything else and backed off harder.
      if (THROTTLED.has(res.status)) {
        throttled += 1;
        await sleep(attempt * 5000);
        continue;
      }
      // 404 is not believed on the first try either: several pages call
      // notFound() when their data request fails, so an overloaded API surfaces
      // as a 404 rather than a 5xx. Only a repeated 404 is an answer.
      if (res.status !== 404 && res.status < 500) return last;
    } catch {
      last = { status: 0, location: null, body: '' };
    }
    if (attempt < ATTEMPTS) await sleep(attempt * 750);
  }

  transientFailures += 1;
  return last;
}

/** Bounded parallelism — the site is small, but not a load target. */
async function mapLimit(items, fn) {
  const out = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
      if (PACE_MS) await sleep(PACE_MS);
    }
  });
  await Promise.all(workers);
  return out;
}

const LOC_RE = /<loc>([^<]+)<\/loc>/g;
const HREFLANG_RE = /<xhtml:link[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g;
const ROBOTS_RE = /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i;
const CANONICAL_RE = /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i;
const ANCHOR_RE = /<a[^>]+href="(\/[^"#?]*)"/g;

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));

function matchAll(re, text, pick) {
  const found = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) found.push(pick(m));
  return found;
}

async function collectSitemapUrls() {
  const index = await fetchText(`${BASE}/sitemap.xml`);
  if (index.status !== 200) {
    // Nothing to audit and nothing proven — the loudest outcome, not a quiet exit.
    inconclusive(totalFetches, totalFetches);
  }
  const files = matchAll(LOC_RE, index.body, (m) => decode(m[1]));

  const urls = new Map(); // url -> hreflang alternates declared for it
  await mapLimit(files, async (file) => {
    const res = await fetchText(file);
    if (res.status !== 200) {
      note('7.4', file, `sitemap file itself answered ${res.status}`);
      return;
    }
    // Each <url> block: its <loc> plus the hreflang alternates inside it.
    for (const block of res.body.split('<url>').slice(1)) {
      const loc = matchAll(LOC_RE, block, (m) => decode(m[1]))[0];
      if (!loc) continue;
      const alts = matchAll(HREFLANG_RE, block, (m) => decode(m[2]));
      urls.set(loc, alts);
    }
  });
  return urls;
}

async function crawlInternalLinks() {
  const seeds = [];
  for (const lang of LANGS) for (const p of SEED_PATHS) seeds.push(`${BASE}/${lang}${p}`);

  // url -> the entry points it was linked from, so a broken page can say where
  // the link lives instead of just that one exists.
  const links = new Map();
  await mapLimit(seeds, async (seed) => {
    const res = await fetchText(seed);
    if (res.status !== 200) {
      note('7.2', seed, `entry point answered ${res.status}`);
      return;
    }
    for (const href of matchAll(ANCHOR_RE, res.body, (m) => m[1])) {
      if (/^\/(en|ru|es|fr|pt)\/(category|genre|collection|tag|author|book)\//.test(href)) {
        const url = `${BASE}${href}`;
        if (!links.has(url)) links.set(url, new Set());
        links.get(url).add(seed);
      }
    }
  });
  return links;
}

/** One fetch per URL, reused by every rule that needs its head. */
async function inspect(urls) {
  const seen = new Map();
  await mapLimit([...urls], async (url) => {
    const res = await fetchText(url);
    seen.set(url, {
      status: res.status,
      location: res.location,
      robots: res.body.match(ROBOTS_RE)?.[1] ?? null,
      canonical: res.body.match(CANONICAL_RE)?.[1] ?? null,
    });
  });
  return seen;
}

const isNoindex = (robots) => !!robots && /noindex/i.test(robots);

async function runFullContract() {
  const sitemap = await collectSitemapUrls();
  const linked = await crawlInternalLinks();

  const everything = new Set([...sitemap.keys(), ...linked.keys()]);
  for (const alts of sitemap.values()) for (const a of alts) everything.add(a);
  const pages = await inspect(everything);

  // If a large share of fetches never got a clean answer, this run says nothing
  // about the site — it says the site was busy, quite possibly because of us.
  // Reporting violations here would be manufacturing them.
  if (transientFailures / Math.max(totalFetches, 1) > UNRELIABLE_RATIO) {
    inconclusive(transientFailures, totalFetches);
  }

  // 7.2 — nothing indexable links to something non-indexable.
  for (const [url, sources] of linked) {
    const page = pages.get(url);
    if (!page) continue;
    const from = [...sources].join(', ');
    if (page.status !== 200) note('7.2', url, `answered ${page.status}`, from);
    else if (isNoindex(page.robots)) note('7.2', url, 'is noindex', from);
  }

  // 7.4 — everything advertised is indexable and addressable.
  for (const [url, alternates] of sitemap) {
    const page = pages.get(url);
    if (!page) continue;
    if (page.status !== 200) {
      note(
        '7.4',
        url,
        `in sitemap but answered ${page.status}${page.location ? ` → ${page.location}` : ''}`
      );
      continue;
    }
    if (isNoindex(page.robots)) note('7.4', url, 'in sitemap but noindex');
    if (page.canonical && page.canonical.replace(/\/$/, '') !== url.replace(/\/$/, '')) {
      note('7.4', url, `in sitemap but canonicalises to ${page.canonical}`);
    }
    // Keyed by the alternate, not by the page that declares it: one broken
    // alternate is one broken address, however many pages point at it.
    for (const alt of alternates) {
      const altPage = pages.get(alt);
      if (!altPage) continue;
      if (altPage.status !== 200)
        note('7.4', alt, `declared as hreflang alternate but answered ${altPage.status}`, url);
      else if (isNoindex(altPage.robots))
        note('7.4', alt, 'declared as hreflang alternate but is noindex', url);
    }
  }

  // 7.6 — everything advertised is reachable by at least one internal link.
  // Books and static pages are excluded: they are reached from listings that
  // paginate, so absence from the first page is not an orphan.
  for (const url of sitemap.keys()) {
    if (!/\/(category|genre|collection|tag)\//.test(url)) continue;
    if (!linked.has(url))
      note(
        '7.6',
        url,
        'in sitemap but unreachable without JavaScript — no internal link in server HTML'
      );
  }

  report({ sitemap: sitemap.size, linked: linked.size, checked: pages.size });
}

/** How many addresses the smoke run touches. Small enough to survive a cold start. */
const SMOKE_HUBS = ['categories', 'genres', 'collections', 'tags'];

/**
 * The post-deploy run: a handful of addresses, not the whole contract.
 *
 * The full crawl was tried three times immediately after a deploy and produced
 * false findings all three times (21%, 37% and 13% of fetches failing, then 164
 * and 138 "violations" whose addresses all answered 200 minutes later). A single
 * container has just restarted; 206 sequential requests are the load. This is not
 * a threshold to tune, it is the wrong moment to ask.
 *
 * So the deploy gets a smoke test: every hub, one taxonomy of each kind, a book
 * and an author. It catches the coarse regressions — a hub that stopped rendering
 * its links, a page type that started answering 500 — and it warms the instance
 * for the nightly run that does check the contract in full.
 */
async function runSmoke() {
  const sitemap = await collectSitemapUrls();
  const byKind = (kind) => [...sitemap.keys()].filter((u) => u.includes(`/${kind}/`)).sort()[0];

  const hubs = LANGS.map((lang, i) => `${BASE}/${lang}/${SMOKE_HUBS[i % SMOKE_HUBS.length]}`);
  const samples = ['category', 'genre', 'collection', 'tag', 'book', 'author']
    .map(byKind)
    .filter(Boolean);
  const homes = LANGS.map((lang) => `${BASE}/${lang}`);
  const targets = [...new Set([...homes, ...hubs, ...samples])];

  const pages = await inspect(new Set(targets));

  if (transientFailures / Math.max(totalFetches, 1) > UNRELIABLE_RATIO) {
    inconclusive(transientFailures, totalFetches);
  }

  for (const url of targets) {
    const page = pages.get(url);
    if (!page) continue;
    if (page.status !== 200 && page.status !== 308) {
      note('smoke', url, `answered ${page.status}`);
    } else if (page.status === 200 && isNoindex(page.robots)) {
      note('smoke', url, 'is noindex');
    }
  }

  // The regression that started all of this: a hub whose server HTML contains no
  // link to any term. Cheap to check and the whole point of the deploy gate.
  await mapLimit(hubs, async (hub) => {
    const res = await fetchText(hub);
    if (res.status !== 200) return;
    const termLinks = matchAll(ANCHOR_RE, res.body, (m) => m[1]).filter((href) =>
      /^\/(en|ru|es|fr|pt)\/(category|genre|collection|tag)\//.test(href)
    );
    if (termLinks.length === 0) {
      note('smoke', hub, 'hub renders no taxonomy link in server HTML (7.6 regression)');
    }
  });

  report({ sitemap: sitemap.size, linked: hubs.length, checked: pages.size });
}

/**
 * "Could not check" must be the loudest outcome, not the quietest.
 *
 * Refusing to report violations when most fetches failed protects against
 * manufacturing alerts — but it has an obvious failure mode: when the site is
 * genuinely down, every fetch fails and the check would fall silent exactly when
 * it matters most. So this is its own status, it fails the step, and it says so
 * before anything else.
 */
function inconclusive(failed, total) {
  const share = Math.round((failed / Math.max(total, 1)) * 100);
  const out = [
    `# 🚨 INCONCLUSIVE — the SEO audit could not check ${BASE}`,
    '',
    `**${failed} of ${total} requests (${share}%) never got a clean answer after ${ATTEMPTS} attempts.**`,
    '',
    'This is not "clean" and not "violations found" — it is a third state, and a worse one:',
    'the site may be down, unreachable or overloaded, and nothing about the contract was verified.',
    '',
    'Check the site is up before rerunning. If it is up, the audit itself is the problem.',
  ].join(String.fromCharCode(10));

  console.error(out);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + String.fromCharCode(10));
  process.exit(2);
}

function report({ sitemap, linked, checked }) {
  const rows = [...findings.entries()].sort(([a], [b]) => a.localeCompare(b));

  const lines = [
    `# SEO contract audit — ${BASE} (${MODE})`,
    '',
    `Sitemap URLs: **${sitemap}** · internal links found: **${linked}** · pages fetched: **${checked}**`,
    ...(throttled > 0
      ? [
          '',
          `⏳ **Throttled ${throttled} time(s)** (403/429). That is the audit hitting the API's per-IP`,
          "rate limit, not a defect in any page. If this is not zero, the audit's pacing is too fast",
          'for the current `RATE_LIMIT_GLOBAL_MAX` — fix the pacing, do not read it as a finding.',
        ]
      : []),
    '',
  ];

  if (rows.length === 0) {
    lines.push(
      MODE === 'smoke'
        ? '✅ **Clean.** Hubs render their links and every sampled page answers.'
        : '✅ **Clean.** 7.2, 7.4 and 7.6 all hold.'
    );
  } else {
    // Addresses, not occurrences. One blinking page used to be counted three or
    // more times over; that arithmetic is what made a small outage unreadable.
    lines.push(`❌ **${rows.length} address(es) with problems.**`, '');
    lines.push('| URL | Checks | Problem | Seen from |', '| --- | --- | --- | --- |');
    for (const [url, entry] of rows) {
      const sources = [...entry.sources];
      const from =
        sources.length === 0
          ? '—'
          : sources.length > 2
            ? `${sources.slice(0, 2).join(', ')} +${sources.length - 2}`
            : sources.join(', ');
      lines.push(
        `| ${url} | ${[...entry.rules].sort().join(', ')} | ${[...entry.problems].join('; ')} | ${from} |`
      );
    }
    lines.push('');
  }

  const out = lines.join('\n');
  console.log(out);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${out}\n`);

  process.exit(rows.length === 0 ? 0 : 1);
}

const run = MODE === 'smoke' ? runSmoke : runFullContract;

run().catch((error) => {
  console.error('SEO audit could not run:', error);
  process.exit(2);
});
