// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * LEGACY-145: api/endpoints/public.ts mixed calls with and without an explicit cache
 * mode, and the difference was accidental, not documented.
 *
 * The default is not "no caching": a fetch without an explicit mode lands in the Next
 * data cache with `revalidate = false`, i.e. forever. A consumer page's
 * `dynamic = 'force-dynamic'` does not rescue it — that only re-runs the handler, while
 * the fetch underneath still answers from the cache. The same trap is written up in
 * `app/sitemaps/[filename]/route.ts`, where it kept the sitemap hours stale.
 *
 * Guard: every server-side public read must state its cache mode explicitly —
 * `next: { revalidate }` or `cache: '...'`. Next's fetch cache itself isn't reproducible
 * in vitest, so this checks the source, not runtime behaviour.
 *
 * LEGACY-369: the guard used to read `api/endpoints/public.ts` and nothing else, and the
 * written rule (`AGENTS.md`) was scoped just as narrowly — "every new function in
 * `api/endpoints/`". A public read living outside that folder fell through both, which is
 * exactly how `lib/seo/retired-slug.ts` ended up with no cache mode at all and pinned
 * `{ newSlug: null }` forever. A hand-written list of files is the same hole with a
 * different shape, so the reach is a set of globs, not names: whatever matches is
 * inspected, and a new file is covered on the day it is written.
 *
 * Out of reach on purpose (arbiter, 13.09.2026): `app/admin/**` and the `httpGetAuth` calls
 * in `api/endpoints/**` — a server-side call there fails before the network (`LEGACY-140`),
 * so Next's data cache never sees it. The exemption does not extend to a bare `httpGet`:
 * that is why `api/endpoints/comments.ts` is inside the reach even though only a client hook
 * calls it today.
 */

const ROOT = path.resolve(__dirname, '../../..');

/** Reach of the guard. Globs, not names — see the LEGACY-369 note above. */
const PATTERNS = [
  'api/endpoints/public*.ts',
  'api/endpoints/comments.ts',
  'app/[lang]/**/*.ts',
  'app/[lang]/**/*.tsx',
  'components/public/**/*.ts',
  'components/public/**/*.tsx',
  'lib/seo/**/*.ts',
  'lib/utils/**/*.ts',
];

/**
 * Files these globs must reach. Without them a typo in a pattern, a renamed folder or a
 * broken walker leaves the guard green having inspected nothing — the failure mode the
 * guard exists to prevent, one level up (L-015).
 */
const ANCHORS = [
  'api/endpoints/public.ts',
  'api/endpoints/public-audio.ts',
  'api/endpoints/comments.ts',
  'app/[lang]/book/[slug]/bookData.ts',
  'app/[lang]/layout.tsx',
  'app/[lang]/tag/[tagSlug]/page.tsx',
  'components/public/authors/authors-page-data.ts',
  'lib/seo/retired-slug.ts',
  'lib/utils/fetch-page.ts',
];

/**
 * Lower bound on inspected call blocks: an empty walk must go red, not green (L-015).
 * Measured, not guessed — 45 blocks across 10 files on 13.09.2026. Raise it when the real
 * count grows; never lower it to make a run pass.
 */
const MIN_BLOCKS = 45;

/** `httpGet<...>(` / `httpGetAuth<...>(` — the call site, not the import line. */
const CALL_SITE = /\bhttpGet(?:Auth)?</g;

/**
 * Bare `fetch(` — `lib/utils/fetch-page.ts` is a public server read written without the
 * http layer, and the generic-based regex above cannot see it. The lookbehind keeps
 * `refetch(` and `prefetch(` out (L-008).
 */
const BARE_FETCH = /(?<![\w.$-])fetch\s*\(/g;

/**
 * Comments are prose, and prose says things like "the legacy over-fetch (11.9 MB)".
 * Blanking them keeps the guard from inspecting a sentence and reporting it as a call;
 * the text is replaced by spaces rather than removed, so every offset stays where it was.
 */
function withoutComments(source: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (!quote && (two === '//' || two === '/*')) {
      const end =
        two === '//'
          ? source.indexOf('\n', i) + 1 || source.length
          : source.indexOf('*/', i) + 2 || source.length;
      out += source.slice(i, end).replace(/[^\n]/g, ' ');
      i = end;
      continue;
    }
    const ch = source[i];
    if (quote) {
      if (ch === String.fromCharCode(92)) {
        out += source.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Every file under `dir`, recursively, whose name matches `test`. */
function walk(dir: string, test: (full: string) => boolean, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, test, out);
    } else if (test(full)) {
      out.push(full);
    }
  }
  return out;
}

const rel = (full: string): string => path.relative(ROOT, full).split(path.sep).join('/');

/** Glob support is deliberately narrow: only the shapes PATTERNS actually uses. */
function expand(pattern: string): string[] {
  if (!pattern.includes('*')) {
    const full = path.join(ROOT, pattern);
    return fs.existsSync(full) ? [full] : [];
  }

  const starstar = pattern.indexOf('/**/');
  if (starstar !== -1) {
    const base = path.join(ROOT, pattern.slice(0, starstar));
    const ext = pattern.slice(starstar + 4).replace('*', '');
    return walk(base, (full) => full.endsWith(ext));
  }

  const dirname = pattern.slice(0, pattern.lastIndexOf('/'));
  const name = pattern.slice(pattern.lastIndexOf('/') + 1);
  const [prefix, ext] = name.split('*');
  return walk(path.join(ROOT, dirname), (full) => {
    const base = path.basename(full);
    const parent = rel(full).slice(0, rel(full).lastIndexOf('/'));
    return parent === dirname && base.startsWith(prefix) && base.endsWith(ext);
  });
}

/**
 * Type arguments nest (`httpGet<PaginatedResponse<BookOverview>>(`), so the closing
 * `>` is found by counting depth, not by a character class. A regex that stops at the
 * first `>` silently drops every call with a nested generic — and a guard blind to a
 * call is a guard that greenlights it.
 */
function blocksFor(source: string, site: RegExp, skipGenerics: boolean): string[] {
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  site.lastIndex = 0;
  while ((match = site.exec(source)) !== null) {
    let i = match.index;
    if (skipGenerics) {
      i = source.indexOf('<', match.index);
      let angle = 0;
      for (; i < source.length; i++) {
        if (source[i] === '<') angle++;
        if (source[i] === '>') {
          angle--;
          if (angle === 0) break;
        }
      }
    }
    const openAt = source.indexOf('(', i);
    if (openAt === -1) continue;
    let parens = 0;
    let j = openAt;
    for (; j < source.length; j++) {
      if (source[j] === '(') parens++;
      if (source[j] === ')') {
        parens--;
        if (parens === 0) break;
      }
    }
    blocks.push(source.slice(openAt, j + 1));
  }
  return blocks;
}

function getCallBlocks(raw: string): string[] {
  const source = withoutComments(raw);
  return [...blocksFor(source, CALL_SITE, true), ...blocksFor(source, BARE_FETCH, false)];
}

const HAS_NEXT = /\bnext\s*:/;
const HAS_REVALIDATE = /\brevalidate\s*:/;
const HAS_CACHE_MODE = /\bcache\s*:\s*['"]/;

const statesModeInline = (text: string): boolean =>
  (HAS_NEXT.test(text) && HAS_REVALIDATE.test(text)) || HAS_CACHE_MODE.test(text);

/**
 * Pages pass the mode by spreading a local object (`const cache = { next: { revalidate } }`
 * … `httpGet(endpoint, cache)`). Only that shape is resolved: an identifier declared
 * `const` in the same file. An unresolved spread stays an offender — otherwise `...opts`
 * becomes a universal way around the guard.
 */
function statesCacheMode(call: string, source: string): boolean {
  if (statesModeInline(call)) return true;
  for (const [, name] of call.matchAll(/(?:\.\.\.)?\b([A-Za-z_$][\w$]*)\s*(?:,|\))/g)) {
    const declared = new RegExp(String.raw`\bconst\s+${name}\s*=\s*\{[\s\S]*?\}\s*;`).exec(source);
    if (declared && statesModeInline(declared[0])) return true;
  }
  return false;
}

describe('public fetch cache mode (LEGACY-145, LEGACY-369)', () => {
  const files = [...new Set(PATTERNS.flatMap(expand))].sort();
  const sources = files.map((file) => ({
    name: rel(file),
    source: fs.readFileSync(file, 'utf-8'),
  }));
  const inspected = sources.filter(({ source }) => getCallBlocks(source).length > 0);

  it('the globs reach every anchor file', () => {
    const reached = new Set(sources.map(({ name }) => name));
    expect(ANCHORS.filter((anchor) => !reached.has(anchor))).toEqual([]);
  });

  it('the walk inspects at least as many call blocks as it did when written', () => {
    const total = inspected.reduce((sum, { source }) => sum + getCallBlocks(source).length, 0);
    expect(total).toBeGreaterThanOrEqual(MIN_BLOCKS);
  });

  it('parses every call site in api/endpoints/public.ts, nested generics included', () => {
    const source = sources.find(({ name }) => name === 'api/endpoints/public.ts')?.source ?? '';
    const callSiteCount = source.match(CALL_SITE)?.length ?? 0;
    expect(callSiteCount).toBeGreaterThan(15);
    expect(blocksFor(source, CALL_SITE, true).length).toBe(callSiteCount);
  });

  it('every server-side public read states its cache mode explicitly', () => {
    const offenders = inspected.flatMap(({ name, source }) =>
      getCallBlocks(source)
        .filter((call) => !statesCacheMode(call, source))
        .map((call) => `${name}: ${call.slice(0, 80)}`)
    );
    expect(offenders).toEqual([]);
  });
});
