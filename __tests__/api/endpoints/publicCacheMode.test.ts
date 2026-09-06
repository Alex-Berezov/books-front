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
 * Guard: every `httpGet`/`httpGetAuth` call in this file must set `next: { revalidate`
 * or `cache:` explicitly. Next's fetch cache itself isn't reproducible in vitest, so
 * this checks the source, not runtime behaviour.
 */

const FILE = path.resolve(__dirname, '../../../api/endpoints/public.ts');

/** `httpGet<...>(` / `httpGetAuth<...>(` — the call site, not the import line. */
const CALL_SITE = /\bhttpGet(?:Auth)?</g;

/**
 * Type arguments nest (`httpGet<PaginatedResponse<BookOverview>>(`), so the closing
 * `>` is found by counting depth, not by a character class. A regex that stops at the
 * first `>` silently drops every call with a nested generic — and a guard blind to a
 * call is a guard that greenlights it.
 */
function getHttpGetCallBlocks(source: string): string[] {
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  CALL_SITE.lastIndex = 0;
  while ((match = CALL_SITE.exec(source)) !== null) {
    let i = source.indexOf('<', match.index);
    let angle = 0;
    for (; i < source.length; i++) {
      if (source[i] === '<') angle++;
      if (source[i] === '>') {
        angle--;
        if (angle === 0) break;
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

describe('api/endpoints/public.ts cache mode (LEGACY-145)', () => {
  const source = fs.readFileSync(FILE, 'utf-8');
  const calls = getHttpGetCallBlocks(source);

  it('parses every call site in the file, nested generics included', () => {
    const callSiteCount = source.match(CALL_SITE)?.length ?? 0;
    expect(callSiteCount).toBeGreaterThan(15);
    expect(calls.length).toBe(callSiteCount);
  });

  it('every httpGet/httpGetAuth call sets an explicit cache mode', () => {
    const offenders = calls.filter((call) => {
      const hasRevalidate = /\bnext\s*:/.test(call) && /\brevalidate\s*:/.test(call);
      const hasCacheMode = /\bcache\s*:\s*['"]/.test(call);
      return !hasRevalidate && !hasCacheMode;
    });
    expect(offenders).toEqual([]);
  });
});
