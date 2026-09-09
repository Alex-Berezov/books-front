/**
 * Bundle budget: pure comparison logic (LEGACY-016, pack `Q3`).
 *
 * Kept apart from the CLI so that `__tests__/scripts/bundleBudget.test.ts` can
 * drive it without a real `.next/` build on disk.
 */

/** Next prints sizes in 1000-based kB; the budget speaks the same units. */
export const TOLERANCE_BYTES = 10_000;

export const formatKb = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;

/**
 * `app-build-manifest.json` keys are entry points, not routes: page entries end
 * with `/page`, while `/layout`, `/error`, `/loading` and `/not-found` describe
 * pieces of a page rather than a first load of their own.
 */
export { shouldAcceptUpdate } from './snapshot-update.mjs';

export const routeNameFromManifestKey = (key) => {
  if (key === '/page') return '/';
  if (!key.endsWith('/page')) return null;
  return key.slice(0, -'/page'.length);
};

/**
 * First Load JS is the gzipped weight of every distinct `.js` file the entry
 * pulls in. CSS is excluded on purpose: Next counts it separately and does not
 * put it into the number this budget guards.
 */
export const firstLoadBytes = (files, gzipSizeOf) => {
  const seen = new Set(files.filter((file) => file.endsWith('.js')));
  let total = 0;
  for (const file of seen) total += gzipSizeOf(file);
  return total;
};

export const collectRouteSizes = (manifestPages, gzipSizeOf) => {
  const sizes = {};
  for (const [key, files] of Object.entries(manifestPages)) {
    const route = routeNameFromManifestKey(key);
    if (route === null) continue;
    sizes[route] = firstLoadBytes(files, gzipSizeOf);
  }
  return sizes;
};

/**
 * Четыре случая красного, и три из них не про рост.
 *
 * Роут, пропавший из сборки, означает, что снимок судит несуществующее; роут, которого
 * в снимке нет, — страницу, которую никто не мерил. Оба превращают бюджет в проверку,
 * не способную покраснеть.
 *
 * 🔴 Усадка краснеет наравне с ростом, и это добавлено ревью поверх трёх случаев решения
 * арбитра. Односторонний допуск копит люфт ровно на тех роутах, которые чинили: страница
 * разгружена с 640 до 300 kB, снимок остался 640 — и случайный тяжёлый импорт, вернувший
 * её к 630 kB, проходит зелёным, потому что разница со снимком отрицательная. Симметричный
 * допуск стоит одной команды `yarn bundle:snapshot` на законную оптимизацию — той же самой,
 * что уже требуется на законный рост.
 */
export const compareToBaseline = (current, baseline, tolerance = TOLERANCE_BYTES) => {
  const failures = [];

  for (const route of Object.keys(baseline).sort()) {
    if (!(route in current)) {
      failures.push({
        kind: 'missing',
        route,
        message: `${route}: есть в снимке (${formatKb(baseline[route])}), но сборка его не дала. Снимок судит несуществующий роут — обнови его: yarn bundle:snapshot`,
      });
    }
  }

  for (const route of Object.keys(current).sort()) {
    if (!(route in baseline)) {
      failures.push({
        kind: 'unknown',
        route,
        message: `${route}: новый роут (${formatKb(current[route])}), в снимке его нет. Проверь размер глазами и запиши: yarn bundle:snapshot`,
      });
      continue;
    }
    const delta = current[route] - baseline[route];
    if (delta > tolerance) {
      failures.push({
        kind: 'grew',
        route,
        delta,
        message: `${route}: ${formatKb(baseline[route])} → ${formatKb(current[route])} (+${formatKb(delta)} при допуске ${formatKb(tolerance)})`,
      });
    } else if (-delta > tolerance) {
      failures.push({
        kind: 'shrank',
        route,
        delta,
        message: `${route}: ${formatKb(baseline[route])} → ${formatKb(current[route])} (−${formatKb(-delta)}, роут похудел). Пересними снимок, иначе он копит люфт: yarn bundle:snapshot`,
      });
    }
  }

  return failures;
};
