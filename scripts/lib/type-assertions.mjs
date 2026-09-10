/**
 * Слой 2 гейта type-sync (пачка Q6, LEGACY-183): рукописные типы `types/api-schema/**`
 * против схемы OpenAPI бэкенда.
 *
 * Чистая логика без ввода-вывода: разбор бареля, отбор пригодных вызовов, текст файла
 * утверждений, разбор диагностики `tsc`, сверка храповика покрытия.
 *
 * Почему утверждения, а не свой компаратор JSON-схемы против разбора TS: решение арбитра
 * от 09.09.2026 (`Q4`, механизм «i») - схему разворачивает `openapi-typescript`, сверку
 * делает `tsc`, своего компаратора формы в проекте не заводится.
 *
 * Почему храповик, а не «всё зелёное»: на 10.09.2026 из пригодных утверждений сходится
 * меньше половины. Корень остальных - в DTO бэкенда (схема беднее ответа,
 * `@ApiProperty({nullable:true})` без `type`), и подгонка верных рукописных типов под такую
 * схему уничтожила бы информацию о полях. Поэтому красным считается регресс покрытых пар,
 * а не наличие непокрытых (решение арбитра 10.09.2026, вариант D, `decisions-log.md`).
 */

/** Направление утверждения: значение из схемы присваивается типу вызова на фронте. */
export const ASSERT_DIRECTION = 'схема -> тип фронта';

/** Метка, которой на время замены прячутся строковые литералы и ключи объекта. */
const STASH_OPEN = '«STASH';
const STASH_CLOSE = 'STASH»';

/** Типы, которым присваивается что угодно: утверждать на них нечего. */
const BLIND = new Set(['void', 'any', 'unknown', 'object']);

/** Имена, которые в утверждении не надо префиксовать баррелем. */
const BUILTIN = new Set([
  'void',
  'string',
  'number',
  'boolean',
  'null',
  'undefined',
  'unknown',
  'any',
  'never',
  'object',
  'symbol',
  'bigint',
  'true',
  'false',
  'Array',
  'Record',
  'Partial',
  'Required',
  'Readonly',
  'Pick',
  'Omit',
  'Exclude',
  'Extract',
  'NonNullable',
  'Awaited',
  'Date',
  'Blob',
  'File',
  'FormData',
]);

/**
 * Имена, которые барель `types/api-schema/index.ts` отдаёт наружу.
 *
 * Барель написан списками `export type { A, B } from './x'`, поэтому берём именно их,
 * а не все объявления файлов каталога: тип, не попавший в барель, из утверждения
 * недостижим по имени.
 */
export function barrelExports(source) {
  const names = new Set();
  for (const block of source.matchAll(/export\s+type\s*\{([^}]*)\}/g)) {
    for (const raw of block[1].split(',')) {
      const piece = raw.trim();
      if (!piece) continue;
      const parts = piece.split(/\s+as\s+/);
      const name = (parts[1] ?? parts[0]).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  for (const decl of source.matchAll(/export\s+(?:interface|type|enum|const)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(decl[1]);
  }
  return names;
}

/** Строковые литералы и ключи объекта: именами типов не являются, по буквам не отличаются. */
function stashLiteralsAndKeys(typeText) {
  const stash = [];
  const hide = (text) => {
    stash.push(text);
    return STASH_OPEN + (stash.length - 1) + STASH_CLOSE;
  };
  const stashed = typeText
    .replace(/'[^']*'|"[^"]*"|`[^`]*`/g, hide)
    .replace(/[A-Za-z_$][\w$]*\s*\??\s*:/g, hide);
  return { stashed, stash };
}

function unstash(text, stash) {
  return text.replace(new RegExp(STASH_OPEN + '(\\d+)' + STASH_CLOSE, 'g'), (_, i) => stash[Number(i)]);
}

/** Все идентификаторы выражения типа - без строковых литералов и ключей объекта. */
export function typeIdentifiers(typeText) {
  const { stashed } = stashLiteralsAndKeys(typeText);
  const cleaned = stashed.replace(new RegExp(STASH_OPEN + '\\d+' + STASH_CLOSE, 'g'), ' ');
  return [...cleaned.matchAll(/[A-Za-z_$][\w$]*/g)].map((m) => m[0]);
}

/** Идентификаторы бареля в выражении типа получают префикс пространства имён. */
export function qualifyType(typeText, exported, ns = 'T') {
  const { stashed, stash } = stashLiteralsAndKeys(typeText);
  const qualified = stashed.replace(/(^|[^\w$.])([A-Za-z_$][\w$]*)/g, (all, before, name) =>
    exported.has(name) && !BUILTIN.has(name) ? before + ns + '.' + name : all,
  );
  return unstash(qualified, stash);
}

/**
 * Классы вызовов, до сверки не доходящих. Ключ машинный - он уезжает в снимок бюджета;
 * подпись человеческая - она уезжает в сообщение об отказе.
 */
export const OUTSIDE_KINDS = {
  noResponseSchema: 'нет схемы ответа',
  unnamedCallType: 'тип вызова не назван',
  namesOutsideBarrel: 'имена вне бареля',
};

/**
 * Пригодные для утверждения вызовы: маршрут разобран, у ответа есть схема, тип вызова
 * назван и все его имена достижимы через барель.
 *
 * Непригодные не прячутся: каждый уносит причину, чтобы прогон мог назвать их числом
 * по классам, а не одним «остальные».
 */
export function selectCandidates(callSites, routeOf, exported) {
  const candidates = [];
  const skipped = [];
  for (const site of callSites) {
    const route = routeOf(site);
    if (!route) continue;
    if (!route.hasResponseSchema) {
      skipped.push({ site, route: route.key, kind: 'noResponseSchema', reason: OUTSIDE_KINDS.noResponseSchema });
      continue;
    }
    const type = (site.type ?? '').trim();
    // `any`, `unknown` и `object` утверждению присваиваются всегда: маршрут попал бы
    // в покрытые, не проверив ничего, а подмена точного типа на `any` осталась бы зелёной.
    if (!type || BLIND.has(type)) {
      skipped.push({ site, route: route.key, kind: 'unnamedCallType', reason: OUTSIDE_KINDS.unnamedCallType });
      continue;
    }
    const unknown = [...new Set(typeIdentifiers(type))].filter((n) => !exported.has(n) && !BUILTIN.has(n));
    if (unknown.length) {
      skipped.push({
        site,
        route: route.key,
        kind: 'namesOutsideBarrel',
        reason: OUTSIDE_KINDS.namesOutsideBarrel + ': ' + unknown.join(', '),
      });
      continue;
    }
    candidates.push({ site, route, type });
  }
  return { candidates, skipped };
}

/** Подписи всех строк снимка бюджета, включая два общих счёта. */
export const BUDGET_LABELS = {
  ...OUTSIDE_KINDS,
  callSites: 'разобранных вызовов',
  assertions: 'собранных утверждений',
};

/**
 * Бюджет пропусков: сколько вызовов не дошло до утверждения, по классам.
 *
 * 🔴 Зачем счёт, а не список: список непокрытых - это baseline, запрещённый пачкой `C19`.
 * Зачем вообще: сверку проходят только вызовы с именованным типом бареля, поэтому вызов
 * с типом мимо бареля добавляется молча и гейт остаётся зелёным - «проверенных единиц ноль»
 * напечатано как успех (класс `L-015`).
 */
export function outsideBudget(skipped) {
  const budget = { noResponseSchema: 0, unnamedCallType: 0, namesOutsideBarrel: 0 };
  for (const item of skipped) {
    // Класс берётся полем, а не разбором текста причины: свободный текст, переформулированный
    // в `selectCandidates`, уехал бы в чужой счётчик, гейт покраснел бы на двух классах, которых
    // никто не трогал, а пересчёт снимка по его же подсказке запёк бы неверную разбивку.
    if (!(item.kind in budget)) throw new Error('неизвестный класс пропуска: ' + item.kind);
    budget[item.kind] += 1;
  }
  return budget;
}

/**
 * Полный снимок бюджета: классы пропусков плюс два общих счёта.
 *
 * 🔴 Общие счёта здесь не для отчёта. Без них размен внутри класса проходит молча: довёл один
 * вызов до бареля и тем же коммитом добавил другой мимо бареля - счёт класса не изменился,
 * снимок в дифф не попал, новый несверяемый вызов следа не оставил. Число разобранных вызовов
 * двигается от любого добавления, число утверждений - от любой потери сверки.
 */
export function budgetSnapshot(callSites, assertionCount, skipped) {
  return {
    callSites: callSites.length,
    assertions: assertionCount,
    ...outsideBudget(skipped),
  };
}

/**
 * Сверка бюджета со снимком. Допуск двусторонний: снижение без пересъёмки тоже красное,
 * иначе односторонний допуск копит люфт ровно там, где пропуски чинили, - тот же довод,
 * что у бюджета бандла (`scripts/bundle-budget.mjs`).
 */
export function compareBudget(committed, current) {
  const problems = [];
  for (const [key, now] of Object.entries(current)) {
    const was = committed?.[key];
    if (typeof was !== 'number') {
      problems.push({ kind: key, detail: `класса нет в снимке бюджета (сейчас ${now})` });
      continue;
    }
    if (was === now) continue;
    problems.push({
      kind: key,
      detail:
        now > was
          ? `${BUDGET_LABELS[key] ?? key}: было ${was}, стало ${now} - вызов, до сверки не дошедший, добавлять молча нельзя`
          : `${BUDGET_LABELS[key] ?? key}: было ${was}, стало ${now} - пересчитать снимок тем же коммитом`,
    });
  }
  for (const key of Object.keys(committed ?? {})) {
    if (key in current) continue;
    problems.push({ kind: key, detail: 'класс из снимка бюджета пропал из расчёта' });
  }
  return problems;
}

/**
 * Текст файла утверждений и разметка «номер утверждения -> маршрут и место вызова».
 *
 * Номер печатается в имени константы, а не выводится из номера строки: строка съезжает
 * от любой правки шапки, и привязка диагностики к маршруту ломалась бы молча.
 */
export function buildAssertionSource(candidates, exported) {
  const lines = [
    '// Файл собран гейтом check-type-sync (слой 2). Править его руками бессмысленно:',
    '// он переписывается каждым прогоном. Направление утверждения - ' + ASSERT_DIRECTION + '.',
    "import type { paths } from './schema';",
    "import type * as T from '@/types/api-schema';",
    '',
  ];
  const byId = new Map();
  candidates.forEach((candidate, i) => {
    const id = i + 1;
    const { route, type, site } = candidate;
    byId.set(id, { route: route.key, file: site.file, line: site.line, type });
    lines.push(
      'type R' +
        id +
        " = paths['" +
        route.path +
        "']['" +
        route.method +
        "']['responses'][" +
        route.code +
        "]['content']['application/json'];",
    );
    lines.push('export const c' + id + ': ' + qualifyType(type, exported) + ' = null as unknown as R' + id + ';');
  });
  lines.push('');
  return { text: lines.join('\n'), byId };
}

/**
 * Диагностика `tsc` -> утверждения, которые не сошлись.
 *
 * Привязка идёт по имени константы `cN` в тексте диагностики, а если его там нет -
 * по номеру строки. Диагностика, которую не удалось привязать ни так, ни так, возвращается
 * отдельным списком: «не разобрали» и «всё сошлось» - разные исходы (L-015).
 */
export function parseDiagnostics(output, byId, sourceText, assertFileName = 'assert.ts') {
  const failed = new Map();
  const unattributed = [];
  const lineOwner = new Map();
  if (sourceText) {
    sourceText.split('\n').forEach((line, i) => {
      const m = line.match(/^export const c(\d+):/);
      if (m) lineOwner.set(i + 1, Number(m[1]));
    });
  }

  const blocks = output.split(/\r?\n(?=\S.*\(\d+,\d+\): error )/);
  for (const block of blocks) {
    const head = block.match(/^(.*?)\((\d+),\d+\): error (TS\d+): ([\s\S]*)$/);
    if (!head) continue;
    const file = head[1].trim();
    const message = head[4].trim();
    // Диагностика чужого файла - поломка механизма, а не расхождение контракта: в программу
    // `tsc` вместе с файлом утверждений тянутся `types/api-schema/**`, и привязка по одному
    // номеру строки приписала бы их ошибку случайному утверждению. Такое уходит
    // в `unattributed`, то есть в отказ с причиной.
    const ours = file.endsWith(assertFileName);
    const byName = ours ? block.match(/\bc(\d+)\b/) : null;
    let id = byName ? Number(byName[1]) : null;
    if (ours && (id === null || !byId.has(id))) id = lineOwner.get(Number(head[2])) ?? null;
    if (!ours || id === null || !byId.has(id)) {
      unattributed.push({ file, line: Number(head[2]), code: head[3], message });
      continue;
    }
    const entry = byId.get(id);
    const list = failed.get(entry.route) ?? [];
    list.push({ id, ...entry, code: head[3], message });
    failed.set(entry.route, list);
  }
  return { failed, unattributed };
}

/** Маршруты, у которых сошлись все утверждения. */
export function coveredRoutes(byId, failed) {
  const all = new Set([...byId.values()].map((e) => e.route));
  return [...all].filter((route) => !failed.has(route)).sort();
}

/**
 * Сверка храповика. Красное дают три случая: покрытый маршрут перестал сходиться,
 * покрытый маршрут выпал из-под утверждений вовсе, и новое покрытие не внесено в снимок.
 *
 * Третий случай красный намеренно: снимок, отстающий от кода в сторону меньшего покрытия,
 * молча разрешает потерять его обратно.
 */
export function compareCoverage(committed, current, failed, byId) {
  const problems = [];
  const now = new Set(current);
  const asserted = new Set([...byId.values()].map((e) => e.route));

  for (const route of committed) {
    if (now.has(route)) continue;
    const breakage = failed.get(route);
    if (breakage) {
      for (const item of breakage) {
        problems.push({
          route,
          detail:
            'утверждение покрытого маршрута не сходится (' +
            item.file +
            ':' +
            item.line +
            ', тип ' +
            item.type +
            '): ' +
            // Сообщение целиком, а не первая строка: у массивов и вложенных объектов первая
            // строка говорит лишь «не присваивается», а имя поля лежит в отступной части.
            item.message.split('\n').join('\n      '),
        });
      }
      continue;
    }
    if (!asserted.has(route)) {
      problems.push({
        route,
        detail:
          'покрытый маршрут выпал из-под утверждений: вызов снят либо его тип перестал быть именованным типом бареля',
      });
    }
  }

  for (const route of current) {
    if (committed.includes(route)) continue;
    problems.push({
      route,
      detail: 'маршрут сходится со схемой, но в снимке покрытия его нет - пересчитать снимок тем же коммитом',
    });
  }

  return problems;
}
