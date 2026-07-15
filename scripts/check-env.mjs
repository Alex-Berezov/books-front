#!/usr/bin/env node
/**
 * Regression guard for canonical backend API env name.
 *
 * The single source of truth for the backend API base URL is
 * `NEXT_PUBLIC_API_BASE_URL` (see ai-context/legacy-warnings.md LEGACY-002).
 *
 * The non-canonical `NEXT_PUBLIC_API_URL` must NOT be reintroduced in
 * application source — it caused dev requests (fetchPageBySlug, social login,
 * seed script) to hit the production API by default.
 *
 * Run: `node scripts/check-env.mjs`
 * Exits non-zero if the forbidden name is found in scanned source files.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['lib', 'app', 'components', 'scripts', 'api', 'providers', 'types'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.js']);
const FORBIDDEN = 'NEXT_PUBLIC_API_URL';

const findings = [];

const walk = (dir) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name === 'coverage' || name.startsWith('.')) {
      continue;
    }
    const fullPath = join(dir, name);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!EXTENSIONS.has(extname(name))) {
      continue;
    }
    // Skip this repo's own guard scripts (they legitimately mention the names they guard).
    if (/^check-.*\.mjs$/i.test(name)) {
      continue;
    }
    const text = readFileSync(fullPath, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (line.includes(FORBIDDEN)) {
        findings.push(`${relative(ROOT, fullPath)}:${index + 1}: ${line.trim()}`);
      }
    });
  }
};

for (const dir of SCAN_DIRS) {
  walk(join(ROOT, dir));
}

if (findings.length > 0) {
  console.error(
    `✖ Found non-canonical env name "${FORBIDDEN}" in ${findings.length} location(s).\n` +
      `  Use "NEXT_PUBLIC_API_BASE_URL" instead (see ai-context/legacy-warnings.md LEGACY-002).\n`
  );
  for (const f of findings) {
    console.error(`  ${f}`);
  }
  process.exit(1);
}

console.log('✓ No non-canonical env names found. "NEXT_PUBLIC_API_BASE_URL" is the only API base URL env.');
