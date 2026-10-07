import { NextResponse } from 'next/server';
import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/constants/cache';
import { loadLandingPresence, type HasLanding } from '@/lib/seo/landing-presence';
import { buildLlmsTxt } from '@/lib/seo/llms';

/**
 * Rendered per request, like the sitemap, and never at build time: prerendering would add
 * 15 `getBookCards` calls to an image build that already sits at the API rate limit
 * (`LEGACY-411`).
 */
export const dynamic = 'force-dynamic';

/**
 * The landing counts are kept in the process for `PUBLIC_REVALIDATE_SECONDS`, on top of the
 * fetch data cache, so `/llms.txt` may lag the sitemap by up to two such windows.
 * The fetch cache alone does not cover failures: a 429 or 5xx is not stored, so without this
 * every crawler hit on a struggling API would send all 15 counts upstream again.
 */
const PRESENCE_TTL_MS = PUBLIC_REVALIDATE_SECONDS * 1000;
let presence: { at: number; hasLanding: Promise<HasLanding> } | null = null;

/**
 * The http layer has no request timeout, and a hung API must not hang `/llms.txt` — a slow answer
 * is exactly what Lighthouse reports. Past the deadline every landing counts as unknown, i.e. kept,
 * the same answer an API failure gives.
 */
const PRESENCE_DEADLINE_MS = 3000;
const KEEP_ALL: HasLanding = () => true;

function withDeadline(counting: Promise<HasLanding>): Promise<HasLanding> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<HasLanding>((resolve) => {
    timer = setTimeout(() => resolve(KEEP_ALL), PRESENCE_DEADLINE_MS);
  });
  return Promise.race([counting, deadline]).finally(() => clearTimeout(timer));
}

/**
 * The promise itself is kept, not its result: requests arriving while a count is still in flight
 * share it instead of each sending its own 15 calls.
 */
function getLandingPresence(): Promise<HasLanding> {
  const now = Date.now();
  if (!presence || now - presence.at >= PRESENCE_TTL_MS) {
    presence = { at: now, hasLanding: withDeadline(loadLandingPresence('llms.txt')) };
  }
  return presence.hasLanding;
}

export async function GET() {
  return new NextResponse(buildLlmsTxt(await getLandingPresence()), {
    headers: {
      // `text/plain`, not `text/markdown`: browsers render it instead of offering a download.
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
