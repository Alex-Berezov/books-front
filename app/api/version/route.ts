import { NextResponse } from 'next/server';

/**
 * Which build is currently serving.
 *
 * The post-deploy audit needs to know it is looking at the version that was just
 * shipped. Waiting for three consecutive 200s is not enough: the outgoing
 * container answers 200 right up to the moment it is replaced, so the audit could
 * pass its readiness check against the old code and then report a clean contract
 * for a version that was never deployed — or, as happened on 06.08.2026, crawl
 * straight into the swap and report 164 violations that did not exist.
 *
 * The SHA is baked in at image build time (`APP_COMMIT_SHA` build arg) and read
 * at runtime, so it identifies the running container, not the request.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { sha: process.env.APP_COMMIT_SHA ?? null },
    { headers: { 'cache-control': 'no-store' } }
  );
}
