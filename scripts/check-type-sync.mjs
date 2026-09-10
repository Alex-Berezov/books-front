#!/usr/bin/env node
/**
 * Гейт type-sync (пачки Q4 и Q6, LEGACY-016 / LEGACY-183).
 *
 * Стережёт контракт фронта с бэкендом по трём вещам:
 *   1) каждый типизированный вызов http-клиента разрешается в существующую пару метод+путь;
 *   2) пара, у которой была схема ответа, её не теряет;
 *   3) поле ответа, объявленное схемой, не исчезает.
 *
 * Слой 2 (Q6, 10.09.2026): рукописный тип вызова сверяется со схемой ответа машинно -
 * `openapi-typescript` разворачивает снимок во временный каталог вне git, рядом собирается
 * файл утверждений присваиваемости, вердикт выносит `tsc`. Красное даёт регресс маршрута
 * из закоммиченного снимка покрытия `type-sync/covered-types.json`, а не наличие
 * непокрытых: у большинства непокрытых корень в DTO бэкенда, и подгонка верных рукописных
 * типов под беднее схему уничтожила бы информацию о полях (решение арбитра 10.09.2026,
 * вариант D, `books-app-docs/ai-context/decisions-log.md`).
 *
 * Источник истины - схема OpenAPI бэкенда. Её побайтовая копия лежит рядом
 * (scripts/type-sync/api-schema.json): читать соседний репозиторий в конвейере нельзя,
 * там чекаут одного репозитория, и такая проверка молча пропускала бы себя. Когда сосед
 * на месте, тождество копии оригиналу сверяется и расходится красным.
 *
 * Пригодным для утверждения считается вызов, у которого маршрут разобран, ответ описан схемой
 * под `application/json`, тип вызова назван и все его имена достижимы через барель
 * types/api-schema. Непригодные печатаются числом по классам: «сверять нечем» и «всё сходится» -
 * разные исходы (L-015).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  barrelExports,
  buildAssertionSource,
  budgetSnapshot,
  compareBudget,
  compareCoverage,
  coveredRoutes,
  parseDiagnostics,
  selectCandidates,
} from './lib/type-assertions.mjs';
import {
  buildSurface,
  compareSurface,
  extractCallSites,
  indexApiPaths,
  resolveUrl,
  shouldAcceptUpdate,
  successResponseSchema,
} from './lib/type-sync.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONT_ROOT = resolve(HERE, '..');
// Смотрим не только api/endpoints: вызовы живут и на страницах, и в lib - например
// `GET /{lang}/slug-redirect` из lib/seo/retired-slug.ts. Ограничение одним каталогом
// делало зелёную строку шире правды.
const SCAN_DIRS = ['api', 'app', 'lib', 'components', 'providers'];
const SCHEMA_COPY = join(HERE, 'type-sync/api-schema.json');
const SURFACE_FILE = join(HERE, 'type-sync/surface.json');
const COVERAGE_FILE = join(HERE, 'type-sync/covered-types.json');
// Бюджет вызовов, до сверки не доходящих: без него новый вызов с типом мимо бареля
// добавляется молча и гейт остаётся зелёным (решение арбитра 10.09.2026, вариант A).
const OUTSIDE_FILE = join(HERE, 'type-sync/outside-assertions.json');
const BARREL_FILE = join(FRONT_ROOT, 'types/api-schema/index.ts');
// Каталог вывода - под node_modules намеренно: он вне git по своей природе, и правило
// в .gitignore на путь, которого при выключенном слое не существует, заводить не пришлось
// (мёртвая ветка, класс LEGACY-106). Вывод генератора никогда не идёт в types/**.
const TMP_DIR = join(FRONT_ROOT, 'node_modules/.cache/type-sync');
// Соседа ищем двумя кандидатами, как это делают check-langs-sync.mjs и
// check-reserved-slugs.mjs: из рабочей копии в .claude/worktrees/* репозиторий books
// лежит на два уровня выше, и одного кандидата там не хватает.
const NEIGHBOUR_CANDIDATES = [
  resolve(FRONT_ROOT, '../books/libs/api-client/api-schema.json'),
  resolve(FRONT_ROOT, '../../books/libs/api-client/api-schema.json'),
];
const NEIGHBOUR_SCHEMA = NEIGHBOUR_CANDIDATES.find((p) => existsSync(p)) ?? null;

function fail(message, lines = []) {
  console.error(`check-type-sync: ${message}`);
  for (const line of lines) console.error(`  ${line}`);
  process.exit(1);
}

function collectTsFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    // Забытая рабочая копия репозитория внутри репозитория (LEGACY-184) - не наш код.
    if (entry === 'node_modules' || entry === '.claude' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectTsFiles(full, out);
    // `*.examples.ts` - образцы работы с клиентом, а не боевой код: адреса там выдуманы
    // нарочно (`/non-existent-endpoint`). Тот же класс файлов исключён из knip.jsonc
    // с той же причиной, так что это не исключение под гейт, а известная граница.
    else if (/\.(ts|tsx)$/.test(full) && !full.endsWith('.d.ts') && !/\.examples\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

/**
 * Слой 2: утверждения присваиваемости «схема -> рукописный тип вызова», вердикт от `tsc`.
 *
 * Возвращает покрытие и разбор непригодных вызовов. Любая поломка механизма - отказ
 * с причиной, а не тихий пропуск: гейт, который не смог проверить, обязан сказать это
 * вслух (L-015).
 */
function runTypeAssertions(callSites, doc, schemaText) {
  const index = indexApiPaths(doc);
  const routeOf = (site) => {
    if (site.unparsed || site.url === null) return null;
    const path = index.get(site.url);
    if (!path) return null;
    const operation = doc.paths[path]?.[site.method];
    if (!operation) return null;
    const success = successResponseSchema(operation);
    // Утверждение читает схему по пути `['content']['application/json']`, поэтому маршрут
    // с иным типом содержимого пригодным считать нельзя: диагностика пришла бы на строку
    // `type RN`, которую не привязать ни к одному утверждению, и гейт упал бы с невнятной
    // причиной вместо честного «сверять нечем». Таких маршрутов в схеме сегодня нет.
    const asJson =
      success !== null && Boolean(operation.responses?.[String(success.code)]?.content?.['application/json']);
    return {
      key: `${site.method.toUpperCase()} ${path}`,
      path,
      method: site.method,
      code: success ? success.code : null,
      hasResponseSchema: asJson,
    };
  };

  if (!existsSync(BARREL_FILE)) fail(`нет бареля рукописных типов ${relative(FRONT_ROOT, BARREL_FILE)}`);
  const exported = barrelExports(readFileSync(BARREL_FILE, 'utf8'));
  if (!exported.size) {
    fail('барель types/api-schema не отдал ни одного имени - разбор сломан', [
      'зелёное здесь означало бы, что сверять нечего, а сверять есть что',
    ]);
  }

  const { candidates, skipped } = selectCandidates(callSites, routeOf, exported);
  if (!candidates.length) {
    fail('слой 2 не собрал ни одного утверждения', [
      'разбор типов вызовов сломан либо барель пуст - это не «всё сходится»',
    ]);
  }

  const { text, byId } = buildAssertionSource(candidates, exported);
  mkdirSync(TMP_DIR, { recursive: true });
  const schemaFile = join(TMP_DIR, 'schema.d.ts');
  const assertFile = join(TMP_DIR, 'assert.ts');
  const tsconfigFile = join(TMP_DIR, 'tsconfig.json');
  // Схему разворачиваем из той же копии, которую сверяет слой 1, а не из соседа: у слоёв
  // обязан быть один вход, иначе они расходятся в вердиктах на одном и том же дереве.
  writeFileSync(join(TMP_DIR, 'api-schema.json'), schemaText, 'utf8');

  // Искать инструменты надо от двух точек, а не от одной. `import.meta.url` не годится
  // в одиночку: спека гоняет копию этого файла из временного каталога вне репозитория,
  // где `node_modules` нет вовсе, - и гейт падал бы там не по расхождению контракта,
  // а по своей раскладке. Вторая точка - каталог запуска: `yarn ci` всегда зовёт гейт
  // из корня репозитория.
  const requires = [createRequire(import.meta.url), createRequire(join(process.cwd(), 'package.json'))];
  let generatorBin = null;
  let tscBin = null;
  let lastError = null;
  for (const require of requires) {
    try {
      // Путь берётся из поля `bin` пакета, а не собирается строкой: карта `exports`
      // у openapi-typescript подменяет расширение подпути, и жёсткий путь ломается
      // на первом же обновлении зависимости.
      const generatorManifest = require('openapi-typescript/package.json');
      const generatorRoot = dirname(require.resolve('openapi-typescript/package.json'));
      const candidate = resolve(generatorRoot, generatorManifest.bin['openapi-typescript']);
      if (!existsSync(candidate)) throw new Error(`нет файла ${candidate}`);
      generatorBin = candidate;
      tscBin = require.resolve('typescript/bin/tsc');
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!generatorBin || !tscBin) {
    fail(`слой 2 не нашёл инструмент: ${lastError ? lastError.message : 'причина не названа'}`, [
      'openapi-typescript и typescript обязаны стоять в devDependencies',
      `искали от ${fileURLToPath(import.meta.url)} и от ${process.cwd()}`,
    ]);
  }

  const generated = spawnSync(process.execPath, [generatorBin, join(TMP_DIR, 'api-schema.json'), '-o', schemaFile], {
    encoding: 'utf8',
  });
  if (generated.status !== 0 || !existsSync(schemaFile)) {
    fail('openapi-typescript не развернул схему', [
      ...(generated.stdout ?? '').trim().split('\n').filter(Boolean).slice(-5),
      ...(generated.stderr ?? '').trim().split('\n').filter(Boolean).slice(-5),
    ]);
  }

  writeFileSync(assertFile, text, 'utf8');
  const rootTsconfig = join(FRONT_ROOT, 'tsconfig.json');
  if (!existsSync(rootTsconfig)) {
    fail(`слой 2 не нашёл ${relative(FRONT_ROOT, rootTsconfig)}`, [
      'настройки компилятора наследуются от корневого tsconfig, своей копии у гейта нет',
    ]);
  }

  // Настройки компилятора **наследуются** от корневого tsconfig, а не копируются: два набора
  // ничем не сверяются, и поднятая в проекте строгость (первый кандидат -
  // `exactOptionalPropertyTypes`, он же решает класс «схема T | null, фронт ?: T») оставила бы
  // слой 2 судить по старым правилам. Переопределяется только то, что относится к самому
  // прогону: единственный файл, корень для алиасов и отсутствие инкрементального следа.
  writeFileSync(
    tsconfigFile,
    `${JSON.stringify(
      {
        extends: rootTsconfig.replace(/\\/g, '/'),
        compilerOptions: {
          noEmit: true,
          incremental: false,
          baseUrl: FRONT_ROOT.replace(/\\/g, '/'),
          paths: { '@/*': ['./*'] },
          // Плагин Next в отдельном прогоне не нужен и требует своего рантайма.
          plugins: [],
        },
        files: ['assert.ts'],
        include: [],
        exclude: [],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const checked = spawnSync(process.execPath, [tscBin, '-p', tsconfigFile], {
    encoding: 'utf8',
    // Вывод обрезается по умолчанию на 1 МиБ, и обрезка выглядит как отсутствие диагностики:
    // процесс убит, хвост потерян, `status` становится null. Непокрытых маршрутов сегодня
    // семь десятков, их диагностика к этому потолку и растёт.
    maxBuffer: 64 * 1024 * 1024,
  });
  if (checked.error || checked.status === null) {
    fail(`слой 2: tsc не отработал (${checked.error ? checked.error.message : 'процесс убит сигналом'})`, [
      'вывод оборван или процесс не запустился - вердикта нет, а значит нет и зелёного',
    ]);
  }
  // Перевод строки между потоками обязателен: без него последняя строка stdout склеивается
  // с первой строкой stderr, и одна диагностика теряется целиком.
  const output = [checked.stdout ?? '', checked.stderr ?? ''].filter(Boolean).join('\n');
  const { failed, unattributed } = parseDiagnostics(output, byId, text, 'assert.ts');
  if (unattributed.length) {
    fail(`слой 2: диагностика tsc не привязалась к утверждению (${unattributed.length})`, [
      ...unattributed
        .slice(0, 5)
        .map((d) => `${d.file || 'файл не назван'}:${d.line} - ${d.code} ${d.message.split('\n')[0]}`),
      'привязка обязана быть полной: непривязанная диагностика неотличима от зелёного',
      'диагностика чужого файла означает поломку самого механизма, а не расхождение контракта',
    ]);
  }
  if (checked.status !== 0 && !failed.size) {
    fail('слой 2: tsc вернул отказ, но ни одно утверждение не помечено красным', [
      ...output.trim().split('\n').slice(0, 5),
      'это поломка механизма, а не расхождение контракта',
    ]);
  }

  return { covered: coveredRoutes(byId, failed), failed, byId, skipped, assertions: byId.size };
}

/** Разбор непригодных вызовов числом по классам: список непокрытых не коммитится. */
function skippedSummary(skipped) {
  const counts = new Map();
  for (const item of skipped) {
    const kind = item.reason.startsWith('имена вне бареля') ? 'имена вне бареля' : item.reason;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return [...counts.entries()].map(([kind, n]) => `${kind}: ${n}`).join(', ');
}

const updateRequested = process.argv.includes('--update');
const inCi = process.env.CI === 'true' || process.env.CI === '1';
const acceptUpdate = shouldAcceptUpdate(updateRequested, inCi);

if (!existsSync(SCHEMA_COPY) && !acceptUpdate) {
  fail(`нет копии схемы ${relative(FRONT_ROOT, SCHEMA_COPY)}`, [
    'она обязана лежать в репозитории: в конвейере соседнего books нет',
    'снять заново: yarn type-sync:snapshot',
  ]);
}

// Обновление берёт схему у соседа, обычный прогон - только из копии.
let schemaText;
if (acceptUpdate) {
  if (!NEIGHBOUR_SCHEMA) {
    fail('обновление снимка запрошено, но соседнего репозитория books рядом нет', [
      `искали: ${NEIGHBOUR_CANDIDATES.join(' и ')}`,
    ]);
  }
  schemaText = readFileSync(NEIGHBOUR_SCHEMA, 'utf8');
} else {
  schemaText = readFileSync(SCHEMA_COPY, 'utf8');
  if (NEIGHBOUR_SCHEMA) {
    const neighbour = readFileSync(NEIGHBOUR_SCHEMA, 'utf8');
    if (neighbour !== schemaText) {
      fail('копия схемы разошлась с books/libs/api-client/api-schema.json', [
        'схема бэкенда изменилась, а копия и снимок поверхности не пересчитаны',
        'починка: yarn type-sync:snapshot, результат идёт в тот же коммит',
        'схема соседа на своей ветке - сперва сверься с origin/main репозитория books',
      ]);
    }
  } else {
    // Сказать вслух обязательно: в конвейере фронта чекаут одного репозитория,
    // и без этой строки прогон, не сверивший копию, читался бы как сверивший (LEGACY-156).
    console.log(
      'SKIPPED: backend schema not found at a sibling path - the cross-repo check did NOT run. ' +
        'Сверка идёт против копии scripts/type-sync/api-schema.json.',
    );
  }
}

let doc;
try {
  doc = JSON.parse(schemaText);
} catch (error) {
  fail(`схема не разбирается как JSON: ${error.message}`);
}
if (!doc || typeof doc.paths !== 'object' || doc.paths === null || !Object.keys(doc.paths).length) {
  fail('в схеме нет ни одного маршрута - файл обрезан или это не документ OpenAPI');
}

const scanned = SCAN_DIRS.flatMap((d) => collectTsFiles(join(FRONT_ROOT, d)));
const callSites = [];
for (const file of scanned) {
  const src = readFileSync(file, 'utf8');
  const where = relative(FRONT_ROOT, file).replace(/\\/g, '/');
  for (const site of extractCallSites(src)) {
    callSites.push({
      ...site,
      file: where,
      url: resolveUrl(site.urlExpression, src, site.index),
    });
  }
}

if (!callSites.length) {
  fail(`в каталогах ${SCAN_DIRS.join(', ')} не найдено ни одного вызова http-клиента`, [
    'либо каталоги пусты, либо разбор вызовов сломан - зелёное здесь означало бы слепой гейт',
  ]);
}

const surface = buildSurface(callSites, doc);

if (surface.unresolved.length || surface.unknownRoutes.length) {
  const lines = [];
  for (const site of surface.unresolved) {
    lines.push(`${site.file}:${site.line} - адрес не разбирается статически: ${site.urlExpression.replace(/\s+/g, ' ').slice(0, 100)}`);
  }
  for (const site of surface.unknownRoutes) {
    lines.push(`${site.file}:${site.line} - ${site.method.toUpperCase()} ${site.url} нет в схеме бэкенда`);
  }
  fail(`вызовов без маршрута: ${lines.length}`, [
    ...lines,
    'адрес приводится к статической форме по месту вызова; исключений в снимке не заводится',
  ]);
}

if (acceptUpdate) {
  // Что именно меняется, называется словами до перезаписи. Иначе единственным следом
  // контрактной правки остаётся дифф машинного файла на сто килобайт, а «поле пропало»
  // в живом сценарии не краснеет никогда: обновление вызывают как раз по красному.
  if (existsSync(SURFACE_FILE)) {
    try {
      const previous = JSON.parse(readFileSync(SURFACE_FILE, 'utf8'));
      const changes = compareSurface({ routes: previous }, surface);
      if (changes.length) {
        console.log(`check-type-sync: снимок меняется, расхождений ${changes.length}:`);
        for (const change of changes) console.log(`  ${change.route} - ${change.detail}`);
      } else {
        console.log('check-type-sync: поверхность не изменилась, снимок переписан как есть.');
      }
    } catch (error) {
      console.log(`check-type-sync: прежний снимок не разобран (${error.message}), пишем заново.`);
    }
  }
  const assertions = runTypeAssertions(callSites, doc, schemaText);
  // Что уходит из покрытия, называется словами до перезаписи: обновление зовут по красному,
  // и потерянный маршрут иначе остаётся следом только в диффе машинного файла.
  if (existsSync(COVERAGE_FILE)) {
    try {
      const previous = JSON.parse(readFileSync(COVERAGE_FILE, 'utf8'));
      const now = new Set(assertions.covered);
      const lost = previous.filter((route) => !now.has(route));
      const gained = assertions.covered.filter((route) => !previous.includes(route));
      for (const route of lost) console.log(`  покрытие потеряно: ${route}`);
      for (const route of gained) console.log(`  покрытие получено: ${route}`);
    } catch (error) {
      console.log(`check-type-sync: прежний снимок покрытия не разобран (${error.message}), пишем заново.`);
    }
  }

  writeFileSync(SCHEMA_COPY, schemaText, 'utf8');
  writeFileSync(SURFACE_FILE, `${JSON.stringify(surface.routes, null, 2)}\n`, 'utf8');
  writeFileSync(COVERAGE_FILE, `${JSON.stringify(assertions.covered, null, 2)}\n`, 'utf8');
  writeFileSync(
    OUTSIDE_FILE,
    `${JSON.stringify(budgetSnapshot(callSites, assertions.assertions, assertions.skipped), null, 2)}\n`,
    'utf8',
  );
  const described = surface.routes.filter((r) => r.hasResponseSchema).length;
  console.log(
    `check-type-sync: снимок обновлён - ${surface.routes.length} зовомых маршрутов, ` +
      `со схемой ответа ${described}, полей под охраной ${surface.routes.reduce((n, r) => n + r.fields.length, 0)}; ` +
      `утверждений ${assertions.assertions}, покрытых маршрутов ${assertions.covered.length}, ` +
      `непокрытых ${assertions.failed.size}.`,
  );
  process.exit(0);
}

if (updateRequested && inCi) {
  console.log('check-type-sync: --update под CI игнорируется, идёт обычная сверка.');
}

if (!existsSync(SURFACE_FILE)) {
  fail(`нет снимка поверхности ${relative(FRONT_ROOT, SURFACE_FILE)}`, ['снять заново: yarn type-sync:snapshot']);
}

let committed;
try {
  committed = JSON.parse(readFileSync(SURFACE_FILE, 'utf8'));
} catch (error) {
  fail(`снимок поверхности не разбирается: ${error.message}`);
}

const problems = compareSurface({ routes: committed }, surface);
if (problems.length) {
  fail(`поверхность API разошлась со снимком: ${problems.length}`, [
    ...problems.map((p) => `${p.route} - ${p.detail}`),
    'если расхождение законно - пересчитать снимок: yarn type-sync:snapshot',
  ]);
}

if (!existsSync(COVERAGE_FILE)) {
  fail(`нет снимка покрытия ${relative(FRONT_ROOT, COVERAGE_FILE)}`, ['снять заново: yarn type-sync:snapshot']);
}

let committedCoverage;
try {
  committedCoverage = JSON.parse(readFileSync(COVERAGE_FILE, 'utf8'));
} catch (error) {
  fail(`снимок покрытия не разбирается: ${error.message}`);
}
if (!Array.isArray(committedCoverage) || !committedCoverage.length) {
  fail('снимок покрытия пуст или не массив', [
    'пустое покрытие означает выключенный слой 2 при живом шаге - это зелёное ни о чём',
  ]);
}

const assertions = runTypeAssertions(callSites, doc, schemaText);
const coverageProblems = compareCoverage(committedCoverage, assertions.covered, assertions.failed, assertions.byId);
if (coverageProblems.length) {
  fail(`рукописные типы разошлись со схемой: ${coverageProblems.length}`, [
    ...coverageProblems.map((p) => `${p.route} - ${p.detail}`),
    'починка - правка типа под схему; гасить утверждение приведением, подавлением ошибки компилятора или сужением типа нельзя',
    'если расхождение законно (маршрут снят с фронта) - пересчитать снимок: yarn type-sync:snapshot',
  ]);
}

// 🔴 С 10.09.2026 непокрытых нет вовсе, и планка поднята: расхождение рукописного типа
// со схемой красное **всегда**, даже если маршрут ещё не внесён в снимок покрытия.
// Храповик по покрытым парам остаётся вторым рубежом - он ловит пропажу маршрута
// из-под утверждений, чего одна эта проверка не видит.
if (assertions.failed.size) {
  fail(`рукописные типы разошлись со схемой: ${assertions.failed.size}`, [
    ...[...assertions.failed.entries()]
      .slice(0, 20)
      // Сообщение целиком: у массивов и вложенных объектов первая строка говорит лишь
      // «не присваивается», а имя разошедшегося поля лежит в отступной части.
      .map(([route, items]) => `${route} - ${items[0].message.split('\n').join('\n      ')}`),
    'починка - правка типа под схему; гасить утверждение приведением, подавлением ошибки',
    'компилятора или сужением типа нельзя',
  ]);
}

// 🔴 Планка выше считает только утверждения, которые собрались. Вызов, чей тип не проходит
// через барель, до утверждения не доходит вовсе, и без этого рубежа он добавляется молча:
// «проверенных единиц ноль» печаталось бы как успех (класс `L-015`, решение арбитра
// 10.09.2026, вариант A). Коммитится счёт по классам, а не список - список был бы baseline,
// запрещённый пачкой `C19`.
if (!existsSync(OUTSIDE_FILE)) {
  fail(`нет снимка бюджета ${relative(FRONT_ROOT, OUTSIDE_FILE)}`, ['снять заново: yarn type-sync:snapshot']);
}

let committedBudget;
try {
  committedBudget = JSON.parse(readFileSync(OUTSIDE_FILE, 'utf8'));
} catch (error) {
  fail(`снимок бюджета не разбирается: ${error.message}`);
}

const currentBudget = budgetSnapshot(callSites, assertions.assertions, assertions.skipped);
const budgetProblems = compareBudget(committedBudget, currentBudget);
if (budgetProblems.length) {
  fail(`вызовы вне утверждений разошлись со снимком: ${budgetProblems.length}`, [
    ...budgetProblems.map((p) => p.detail),
    'вызов доводится до сверки так: тип ответа объявляется именованным типом бареля',
    'types/api-schema; класс «нет схемы ответа» чинится в books, а не здесь',
    'если изменение законно - пересчитать снимок: yarn type-sync:snapshot',
  ]);
}

const described = surface.routes.filter((r) => r.hasResponseSchema).length;
const guardedFields = surface.routes.reduce((n, r) => n + r.fields.length, 0);
console.log(
  `check-type-sync: ${surface.routes.length} зовомых маршрутов сходятся со снимком ` +
    `(искали в ${SCAN_DIRS.join(', ')}, вызовов ${callSites.length}); ` +
    `со схемой ответа ${described}, полей под охраной ${guardedFields}.`,
);
console.log(
  `check-type-sync: слой 2 - утверждений ${assertions.assertions}, ` +
    `покрытых маршрутов ${assertions.covered.length} (все сходятся со снимком), ` +
    `непокрытых ${assertions.failed.size}; вне утверждений ${assertions.skipped.length} вызовов ` +
    `(${skippedSummary(assertions.skipped)}).`,
);
