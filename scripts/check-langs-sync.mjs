#!/usr/bin/env node
/**
 * Cross-repo language sync guard.
 *
 * Supported UI languages (frontend `SUPPORTED_LANGS` in lib/i18n/lang.ts) MUST
 * match the backend Prisma `Language` enum (books/prisma/schema.prisma).
 *
 * - Always validates that `SUPPORTED_LANGS` equals the expected set
 *   `['en','es','fr','pt','ru']`.
 * - If the sibling backend repo is present at `../books/prisma/schema.prisma`
 *   (e.g. local dev or a CI that checks out both repos), additionally parses
 *   the `enum Language { ... }` block and asserts equality. If the backend
 *   repo is absent, this cross-check is skipped (not a failure).
 *
 * Run: `node scripts/check-langs-sync.mjs`
 * Exits non-zero on mismatch.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const EXPECTED = ['en', 'es', 'fr', 'pt', 'ru'];
const ROOT = process.cwd();
const LANG_FILE = join(ROOT, 'lib/i18n/lang.ts');
const SCHEMA_CANDIDATES = [
  join(ROOT, '../books/prisma/schema.prisma'),
  join(ROOT, '../../books/prisma/schema.prisma'),
];

const parseSupportedLangs = (text) => {
  const match = text.match(/SUPPORTED_LANGS\s*=\s*\[([^\]]*)\]/);
  if (!match) {
    throw new Error('Could not find SUPPORTED_LANGS array in lib/i18n/lang.ts');
  }
  return match[1]
    .split(',')
    .map((part) => part.replace(/['"`]/g, '').trim())
    .filter(Boolean);
};

const parsePrismaLanguageEnum = (text) => {
  const match = text.match(/enum\s+Language\s*\{([^}]*)\}/);
  if (!match) {
    throw new Error('Could not find `enum Language { ... }` in schema.prisma');
  }
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//'));
};

const sameSet = (a, b) => {
  if (a.length !== b.length) return false;
  const aa = [...a].sort();
  const bb = [...b].sort();
  return aa.every((value, index) => value === bb[index]);
};

const errors = [];

let langs;
try {
  langs = parseSupportedLangs(readFileSync(LANG_FILE, 'utf8'));
} catch (error) {
  errors.push(`Failed to parse ${LANG_FILE}: ${error.message}`);
}

if (langs) {
  if (!sameSet(langs, EXPECTED)) {
    errors.push(
      `SUPPORTED_LANGS mismatch.\n  expected: ${EXPECTED.join(', ')}\n  found:    ${langs.join(', ')}`
    );
  } else {
    console.log(`✓ Frontend SUPPORTED_LANGS == ${langs.join(', ')}`);
  }
}

let schemaPath = null;
for (const candidate of SCHEMA_CANDIDATES) {
  if (existsSync(candidate)) {
    schemaPath = candidate;
    break;
  }
}

if (schemaPath) {
  let prismaLangs;
  try {
    prismaLangs = parsePrismaLanguageEnum(readFileSync(schemaPath, 'utf8'));
    if (!sameSet(prismaLangs, EXPECTED)) {
      errors.push(
        `Prisma Language enum mismatch.\n  expected: ${EXPECTED.join(', ')}\n  found:    ${prismaLangs.join(', ')}`
      );
    } else {
      console.log(`✓ Backend Prisma Language enum == ${prismaLangs.join(', ')}`);
    }
    if (langs && prismaLangs && !sameSet(langs, prismaLangs)) {
      errors.push('Frontend SUPPORTED_LANGS and backend Prisma Language enum are OUT OF SYNC.');
    }
  } catch (error) {
    errors.push(`Failed to parse ${schemaPath}: ${error.message}`);
  }
} else {
  console.log('ℹ Backend schema not found at sibling path; cross-repo sync check skipped.');
}

if (errors.length > 0) {
  console.error('\n✖ Language sync check failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('✓ Language sync OK.');
