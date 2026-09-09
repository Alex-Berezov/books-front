#!/usr/bin/env node
/**
 * Гейт type-sync (пачка Q4, LEGACY-016 / LEGACY-183).
 *
 * Стережёт контракт фронта с бэкендом по трём вещам:
 *   1) каждый типизированный вызов http-клиента разрешается в существующую пару метод+путь;
 *   2) пара, у которой была схема ответа, её не теряет;
 *   3) поле ответа, объявленное схемой, не исчезает.
 *
 * Источник истины - схема OpenAPI бэкенда. Её побайтовая копия лежит рядом
 * (scripts/type-sync/api-schema.json): читать соседний репозиторий в конвейере нельзя,
 * там чекаут одного репозитория, и такая проверка молча пропускала бы себя. Когда сосед
 * на месте, тождество копии оригиналу сверяется и расходится красным.
 *
 * Сверка рукописных типов из types/api-schema/** со схемой сюда НЕ входит: DTO бэкенда
 * описывают меньше, чем ручки отдают (проверено на ReadingProgressDto - 3 поля против 7
 * отдаваемых), и строгая сверка требовала бы ухудшать верные рукописные типы. Это
 * отдельная строка очереди, сцепленная с бэкфилом @ApiResponse в books.
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSurface, compareSurface, extractCallSites, resolveUrl, shouldAcceptUpdate } from './lib/type-sync.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONT_ROOT = resolve(HERE, '..');
// Смотрим не только api/endpoints: вызовы живут и на страницах, и в lib - например
// `GET /{lang}/slug-redirect` из lib/seo/retired-slug.ts. Ограничение одним каталогом
// делало зелёную строку шире правды.
const SCAN_DIRS = ['api', 'app', 'lib', 'components', 'providers'];
const SCHEMA_COPY = join(HERE, 'type-sync/api-schema.json');
const SURFACE_FILE = join(HERE, 'type-sync/surface.json');
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
  writeFileSync(SCHEMA_COPY, schemaText, 'utf8');
  writeFileSync(SURFACE_FILE, `${JSON.stringify(surface.routes, null, 2)}\n`, 'utf8');
  const described = surface.routes.filter((r) => r.hasResponseSchema).length;
  console.log(
    `check-type-sync: снимок обновлён - ${surface.routes.length} зовомых маршрутов, ` +
      `со схемой ответа ${described}, полей под охраной ${surface.routes.reduce((n, r) => n + r.fields.length, 0)}.`,
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

const described = surface.routes.filter((r) => r.hasResponseSchema).length;
const guardedFields = surface.routes.reduce((n, r) => n + r.fields.length, 0);
console.log(
  `check-type-sync: ${surface.routes.length} зовомых маршрутов сходятся со снимком ` +
    `(искали в ${SCAN_DIRS.join(', ')}, вызовов ${callSites.length}); ` +
    `со схемой ответа ${described}, полей под охраной ${guardedFields}.`,
);
