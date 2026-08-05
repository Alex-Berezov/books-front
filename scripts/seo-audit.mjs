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
 *   7.6  everything advertised is reachable by at least one internal link
 *
 * No sampling and no caps: the whole sitemap is a few hundred URLs across five
 * languages. A threshold would only create a second thing to get wrong.
 *
 * Usage:  node scripts/seo-audit.mjs [--base https://bibliaris.com]
 * Exit:   0 clean, 1 violations found, 2 the audit itself could not run.
 */

import { appendFileSync } from 'node:fs';

const BASE = (
  process.argv.find((a) => a.startsWith('--base='))?.slice('--base='.length) ||
  process.env.SEO_AUDIT_BASE_URL ||
  'https://bibliaris.com'
).replace(/\/$/, '');

const LANGS = ['en', 'ru', 'es', 'fr', 'pt'];
/**
 * Deliberately low. The first run of this script used 8 and reported 307
 * violations — every one of them an artefact: the site is a single container
 * serving force-dynamic pages that each fan out to the API, so the audit
 * overloaded the target and then blamed it. An audit that cannot tell "broken"
 * from "busy" is worse than none, because a daily alert nobody trusts is a
 * daily alert nobody reads.
 */
const CONCURRENCY = 2;
/** A 5xx or a transport error is retried before it is believed. */
const ATTEMPTS = 3;
/** Above this share of failed fetches the run is not evidence about the site. */
const UNRELIABLE_RATIO = 0.1;

let transientFailures = 0;
let totalFetches = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Entry points crawled for internal links (7.2). */
const SEED_PATHS = ['', '/categories', '/genres', '/collections', '/tags', '/catalog'];

const violations = [];
const note = (rule, url, detail) => violations.push({ rule, url, detail });

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
    console.error(`sitemap index answered ${index.status}`);
    process.exit(2);
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

  const links = new Set();
  await mapLimit(seeds, async (seed) => {
    const res = await fetchText(seed);
    if (res.status !== 200) {
      note('7.2', seed, `entry point answered ${res.status}`);
      return;
    }
    for (const href of matchAll(ANCHOR_RE, res.body, (m) => m[1])) {
      if (/^\/(en|ru|es|fr|pt)\/(category|genre|collection|tag|author|book)\//.test(href)) {
        links.add(`${BASE}${href}`);
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

async function main() {
  const sitemap = await collectSitemapUrls();
  const linked = await crawlInternalLinks();

  const everything = new Set([...sitemap.keys(), ...linked]);
  for (const alts of sitemap.values()) for (const a of alts) everything.add(a);
  const pages = await inspect(everything);

  // If a large share of fetches never got a clean answer, this run says nothing
  // about the site — it says the site was busy, quite possibly because of us.
  // Reporting violations here would be manufacturing them.
  if (transientFailures / Math.max(totalFetches, 1) > UNRELIABLE_RATIO) {
    console.error(
      `Audit unreliable: ${transientFailures} of ${totalFetches} fetches failed after ` +
        `${ATTEMPTS} attempts. Not reporting violations — rerun when the site is idle.`
    );
    process.exit(2);
  }

  // 7.2 — nothing indexable links to something non-indexable.
  for (const url of linked) {
    const page = pages.get(url);
    if (!page) continue;
    if (page.status !== 200) note('7.2', url, `linked page answered ${page.status}`);
    else if (isNoindex(page.robots)) note('7.2', url, 'linked page is noindex');
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
    for (const alt of alternates) {
      const altPage = pages.get(alt);
      if (!altPage) continue;
      if (altPage.status !== 200)
        note('7.4', url, `hreflang alternate ${alt} answered ${altPage.status}`);
      else if (isNoindex(altPage.robots)) note('7.4', url, `hreflang alternate ${alt} is noindex`);
    }
  }

  // 7.6 — everything advertised is reachable by at least one internal link.
  // Books and static pages are excluded: they are reached from listings that
  // paginate, so absence from the first page is not an orphan.
  for (const url of sitemap.keys()) {
    if (!/\/(category|genre|collection|tag)\//.test(url)) continue;
    if (!linked.has(url)) note('7.6', url, 'in sitemap but no internal link points at it');
  }

  report({ sitemap: sitemap.size, linked: linked.size, checked: pages.size });
}

function report({ sitemap, linked, checked }) {
  const byRule = new Map();
  for (const v of violations) byRule.set(v.rule, [...(byRule.get(v.rule) ?? []), v]);

  const lines = [
    `# SEO contract audit — ${BASE}`,
    '',
    `Sitemap URLs: **${sitemap}** · internal links found: **${linked}** · pages fetched: **${checked}**`,
    '',
  ];

  if (violations.length === 0) {
    lines.push('✅ **Clean.** 7.2, 7.4 and 7.6 all hold.');
  } else {
    lines.push(`❌ **${violations.length} violation(s).**`, '');
    for (const [rule, items] of [...byRule].sort()) {
      lines.push(`## ${rule} — ${items.length}`, '', '| URL | Problem |', '| --- | --- |');
      for (const v of items) lines.push(`| ${v.url} | ${v.detail} |`);
      lines.push('');
    }
  }

  const out = lines.join('\n');
  console.log(out);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${out}\n`);

  process.exit(violations.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('SEO audit could not run:', error);
  process.exit(2);
});
