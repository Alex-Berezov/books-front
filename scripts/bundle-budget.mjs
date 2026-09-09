#!/usr/bin/env node
/**
 * Bundle budget gate (LEGACY-016, pack `Q3`, arbiter decision 09.09.2026).
 *
 * `next build` prints a First Load JS table that nobody reads. This reads the
 * same numbers from `.next/app-build-manifest.json`, compares every route with
 * its own recorded size in `scripts/bundle-baseline.json` and fails the build
 * when one grows by more than the tolerance.
 *
 * Run: `yarn build` (chained after `next build`).
 * Refresh the snapshot: `yarn bundle:snapshot`.
 *
 * ⚠️ The refresh is ignored when `CI` is set: a snapshot that rewrites itself
 * on the pipeline is an expectation fitted to the code, i.e. a check that
 * cannot go red.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  TOLERANCE_BYTES,
  collectRouteSizes,
  compareToBaseline,
  formatKb,
  shouldAcceptUpdate,
} from './lib/bundle-budget.mjs';

const ROOT = process.cwd();
const MANIFEST = join(ROOT, '.next', 'app-build-manifest.json');
const BASELINE = join(ROOT, 'scripts', 'bundle-baseline.json');

/**
 * ⚠️ Дверь ровно одна — флаг. Переменной окружения здесь намеренно нет: `ENV` в `Dockerfile`
 * или в настройках раннера превратила бы сверку в переписывание снимка молча и с кодом 0,
 * а видно это было бы только в диффе снимка, который никто не читает.
 */
const updateRequested = process.argv.includes('--update');
const inCi = Boolean(process.env.CI);

const die = (lines) => {
  for (const line of lines) console.error(line);
  process.exit(1);
};

if (!existsSync(MANIFEST)) {
  die([
    'bundle-budget: .next/app-build-manifest.json не найден.',
    'Сначала сборка, потом проверка: `yarn build` делает это одной командой.',
  ]);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

// Общие чанки перечислены почти в каждом из шести десятков входов, а сжатие каждого стоит
// заметно дороже чтения. Без памяти один и тот же файл жался бы десятки раз за прогон,
// причём на каждой локальной сборке и на сборке боевого образа.
const gzipSizes = new Map();
const gzipSizeOf = (file) => {
  const known = gzipSizes.get(file);
  if (known !== undefined) return known;
  const size = gzipSync(readFileSync(join(ROOT, '.next', file))).length;
  gzipSizes.set(file, size);
  return size;
};

const current = collectRouteSizes(manifest.pages ?? {}, gzipSizeOf);

if (Object.keys(current).length === 0) {
  die([
    'bundle-budget: в манифесте нет ни одной записи роута.',
    'Проверка не может покраснеть на пустом входе, поэтому это отказ, а не «всё в порядке».',
  ]);
}

// Решение принимает та же функция, которую стережёт спека: условие, написанное здесь заново,
// разошлось бы с проверенным при первой же правке одного из двух.
const acceptUpdate = shouldAcceptUpdate(updateRequested, inCi);

if (updateRequested && !acceptUpdate) {
  console.error('bundle-budget: обновление снимка в CI игнорируется, идёт обычная сверка.');
}

if (acceptUpdate) {
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  console.log(`bundle-budget: снимок обновлён, роутов ${Object.keys(sorted).length}.`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  die([
    'bundle-budget: scripts/bundle-baseline.json не найден.',
    'Заведи снимок командой `yarn bundle:snapshot` и закоммить его.',
  ]);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const failures = compareToBaseline(current, baseline, TOLERANCE_BYTES);

if (failures.length > 0) {
  die([
    `bundle-budget: ${failures.length} расхождение(й) со снимком scripts/bundle-baseline.json.`,
    ...failures.map((failure) => `  ${failure.message}`),
    '',
    'Рост объяснимый (новая функциональность) — обнови снимок: yarn bundle:snapshot,',
    'и пусть новая цифра приедет строкой диффа в ревью. Допуск не поднимается.',
  ]);
}

const heaviest = Object.entries(current).sort(([, a], [, b]) => b - a)[0];
console.log(
  `bundle-budget: ${Object.keys(current).length} роутов в пределах снимка, ` +
    `самый тяжёлый ${heaviest[0]} — ${formatKb(heaviest[1])}.`
);
