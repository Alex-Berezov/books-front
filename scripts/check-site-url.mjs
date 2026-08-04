#!/usr/bin/env node
/**
 * Build guard for the public site origin.
 *
 * `NEXT_PUBLIC_SITE_URL` feeds canonical, hreflang, og:url, JSON-LD and the
 * sitemap. `NEXT_PUBLIC_API_BASE_URL` feeds data fetching. Mixing the two put
 * `https://api.bibliaris.com/{lang}/tag/{slug}` into the public markup and got
 * 56 non-existent URLs discovered by Google in July 2026
 * (books-app-docs/tasks/tz-seo-subdomain-leak.md).
 *
 * Run: `node scripts/check-site-url.mjs` (wired into `prebuild`).
 * Exits non-zero — and therefore fails the build — when the value is missing or
 * points at a service host.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/** Host prefixes that can never serve public HTML pages. */
const SERVICE_HOST_PREFIXES = ['api.', 'media.', 'cdn.', 'static.', 'assets.'];

/** Next.js loads these itself; a prebuild script has to read them manually. */
const ENV_FILES = ['.env.production.local', '.env.local', '.env.production', '.env'];

const parseEnvFile = (path) => {
  const result = {};
  if (!existsSync(path)) return result;
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes and a trailing inline comment
    value = value.replace(/^["']|["']$/g, '').replace(/\s+#.*$/, '');
    result[key] = value;
  }
  return result;
};

const fileEnv = {};
for (const name of ENV_FILES) {
  const parsed = parseEnvFile(join(ROOT, name));
  for (const [key, value] of Object.entries(parsed)) {
    if (fileEnv[key] === undefined) fileEnv[key] = value;
  }
}

const readEnv = (name) => {
  const fromProcess = process.env[name];
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess.trim();
  const fromFile = fileEnv[name];
  return fromFile !== undefined && fromFile !== '' ? fromFile.trim() : undefined;
};

const fail = (message) => {
  console.error(`✖ ${message}\n`);
  process.exit(1);
};

const siteUrl = readEnv('NEXT_PUBLIC_SITE_URL');
const apiBaseUrl = readEnv('NEXT_PUBLIC_API_BASE_URL');

if (!siteUrl) {
  fail(
    'NEXT_PUBLIC_SITE_URL is not set.\n' +
      '  It is the public site origin used for canonical, hreflang, og:url, JSON-LD and sitemap.\n' +
      '  Set it in .env.local (dev) or as a build arg / GitHub Actions variable (prod).'
  );
}

let parsed;
try {
  parsed = new URL(siteUrl);
} catch {
  fail(`NEXT_PUBLIC_SITE_URL is not a valid absolute URL: "${siteUrl}"`);
}

if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
  fail(`NEXT_PUBLIC_SITE_URL must use http(s), got "${parsed.protocol}"`);
}

const host = parsed.hostname.toLowerCase();
const badPrefix = SERVICE_HOST_PREFIXES.find((prefix) => host.startsWith(prefix));
if (badPrefix) {
  fail(
    `NEXT_PUBLIC_SITE_URL="${siteUrl}" points at the service host "${host}".\n` +
      '  Public page URLs must use the site domain. Use NEXT_PUBLIC_API_BASE_URL for API calls.'
  );
}

if (apiBaseUrl) {
  let apiHost;
  try {
    apiHost = new URL(apiBaseUrl).host;
  } catch {
    apiHost = undefined;
  }
  if (apiHost && apiHost === parsed.host) {
    fail(
      `NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_API_BASE_URL resolve to the same host "${apiHost}".\n` +
        '  They must be different origins: pages vs API.'
    );
  }
}

console.log(`✓ NEXT_PUBLIC_SITE_URL = ${siteUrl} (public origin, not a service host)`);
