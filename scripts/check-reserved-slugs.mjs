#!/usr/bin/env node
/**
 * Reserved-slug guard.
 *
 * A CMS page slug becomes the first segment after `/:lang`, which is where every
 * static route of this app lives. App Router always prefers the static segment,
 * so a page whose slug matches a route is unreachable — and no uniqueness check
 * can see it, because the collision is with a route, not with a row.
 *
 * This guard keeps the list honest from the side that changes: it reads the real
 * directories under `app/[lang]/` and fails when one of them is missing from
 * `lib/constants/reserved-slugs.ts`. Adding a route therefore forces the same
 * commit to reserve its name.
 *
 * When the sibling backend repo is present it additionally compares the two
 * lists — the backend copy is the one that actually rejects a save, and a
 * divergence there means the site enforces something different from what it
 * routes. Absent repo: the cross-check is skipped, not failed (same rule as
 * `check-langs-sync.mjs`).
 *
 * Run: `node scripts/check-reserved-slugs.mjs`
 * Exits non-zero on mismatch.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ROUTES_DIR = join(ROOT, 'app/[lang]');
const FRONT_LIST = join(ROOT, 'lib/constants/reserved-slugs.ts');
const BACKEND_CANDIDATES = [
  join(ROOT, '../books/src/shared/constants/reserved-slugs.ts'),
  join(ROOT, '../../books/src/shared/constants/reserved-slugs.ts'),
];

const parseReservedSlugs = (text, where) => {
  const match = text.match(/RESERVED_SLUGS\s*=\s*\[([^\]]*)\]/);
  if (!match) {
    throw new Error(`Could not find the RESERVED_SLUGS array in ${where}`);
  }
  return match[1]
    .split(',')
    .map((part) => part.replace(/['"`]/g, '').trim())
    .filter(Boolean);
};

/**
 * Route segments are the directories under `app/[lang]` that appear in a URL.
 *
 * Three kinds do not appear literally, and each has to be handled differently:
 *  - `[slug]`, `[...slug]` — dynamic. They claim no fixed name and collide with
 *    nothing; they are what a page slug is supposed to land on. Skipped.
 *  - `(group)` — a route group. It contributes nothing to the URL, but its
 *    children sit at *this* level, so `(marketing)/pricing` serves `/:lang/pricing`.
 *    Recursed into. Treating it as a segment would both fail the build on a name
 *    nobody can reserve and hide the real one.
 *  - `@slot` — a parallel route, same reasoning as a group.
 *
 * Anything else is a literal segment; its own children live deeper in the path
 * and cannot collide with a first-segment page slug, so there is no recursion.
 */
const readRouteSegments = (dir = ROUTES_DIR) => {
  const segments = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const { name } = entry;

    if (name.startsWith('(') || name.startsWith('@')) {
      segments.push(...readRouteSegments(join(dir, name)));
      continue;
    }
    if (name.startsWith('[') || name.startsWith('_') || name.startsWith('.')) continue;

    segments.push(name);
  }

  return [...new Set(segments)].sort();
};

const fail = (lines) => {
  console.error(`✗ ${lines.join('\n  ')}`);
  process.exit(1);
};

const routes = readRouteSegments();
const front = parseReservedSlugs(readFileSync(FRONT_LIST, 'utf8'), 'lib/constants/reserved-slugs.ts');

const unreserved = routes.filter((segment) => !front.includes(segment));
if (unreserved.length > 0) {
  fail([
    `Route segments not reserved: ${unreserved.join(', ')}`,
    'A CMS page could be saved under this name and would never be reachable.',
    `Add them to lib/constants/reserved-slugs.ts and to the backend copy`,
    '(books/src/shared/constants/reserved-slugs.ts), which is what rejects the save.',
  ]);
}

const sorted = [...front].sort();
if (sorted.join(',') !== front.join(',')) {
  fail(['lib/constants/reserved-slugs.ts is not sorted — keep it alphabetical so diffs stay readable.']);
}

if (new Set(front).size !== front.length) {
  fail(['lib/constants/reserved-slugs.ts contains duplicates.']);
}

const backendPath = BACKEND_CANDIDATES.find((candidate) => existsSync(candidate));
if (backendPath) {
  const backend = parseReservedSlugs(readFileSync(backendPath, 'utf8'), backendPath);
  const onlyFront = front.filter((slug) => !backend.includes(slug));
  const onlyBackend = backend.filter((slug) => !front.includes(slug));
  if (onlyFront.length > 0 || onlyBackend.length > 0) {
    fail([
      'Frontend and backend reserved-slug lists have drifted.',
      onlyFront.length > 0 ? `Only in frontend: ${onlyFront.join(', ')}` : '',
      onlyBackend.length > 0 ? `Only in backend: ${onlyBackend.join(', ')}` : '',
      'The backend copy is the one that rejects a save — a divergence means the site',
      'enforces something different from what it routes.',
    ].filter(Boolean));
  }
  console.log(
    `✓ ${routes.length} route segments reserved; frontend and backend lists agree (${front.length} slugs).`,
  );
} else {
  console.log(
    `SKIPPED: backend repo not found at a sibling path — the cross-repo check did NOT run.`,
  );
  console.log(
    `⚠ ${routes.length} route segments reserved (${front.length} slugs) — frontend list ONLY, see above.`,
  );
}
