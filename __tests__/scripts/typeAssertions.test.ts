/**
 * Слой 2 гейта type-sync (пачка Q6, LEGACY-183): сверка рукописных типов со схемой.
 *
 * Проверяется чистая логика: что попадает под утверждение, каким текстом оно собирается,
 * как диагностика `tsc` привязывается к маршруту и какие три случая обязаны краснеть
 * у храповика покрытия. Прогон самого `tsc` живёт в гейте, здесь он не нужен: спека
 * стережёт разбор, а не компилятор.
 */

import { describe, expect, it } from 'vitest';
import {
  barrelExports,
  buildAssertionSource,
  compareBudget,
  compareCoverage,
  coveredRoutes,
  outsideBudget,
  parseDiagnostics,
  qualifyType,
  selectCandidates,
  typeIdentifiers,
} from '../../scripts/lib/type-assertions.mjs';

const BARREL = `
// Common types
export type { ISODate, PaginatedResponse } from './common';
export type { Author as PublicAuthor } from './authors';
export interface Local {
  id: string;
}
`;

const exported = barrelExports(BARREL);

const route = (over: Record<string, unknown> = {}) => ({
  key: 'POST /uploads/presign',
  path: '/uploads/presign',
  method: 'post',
  code: 201,
  hasResponseSchema: true,
  ...over,
});

describe('barrelExports', () => {
  it('берёт имена из списков реэкспорта, включая переименование через as', () => {
    expect(exported.has('ISODate')).toBe(true);
    expect(exported.has('PaginatedResponse')).toBe(true);
    // Наружу отдаётся имя после `as`, исходное недостижимо.
    expect(exported.has('PublicAuthor')).toBe(true);
    expect(exported.has('Author')).toBe(false);
  });

  it('видит и собственные объявления бареля', () => {
    expect(exported.has('Local')).toBe(true);
  });
});

describe('typeIdentifiers', () => {
  it('ключи объекта и строковые литералы именами типов не считает', () => {
    expect(typeIdentifiers('{ key: string; url: string }')).toEqual(['string', 'string']);
    expect(typeIdentifiers("'category' | 'genre'")).toEqual([]);
  });

  it('имена типов возвращает', () => {
    expect(typeIdentifiers('PaginatedResponse<PublicAuthor>')).toEqual([
      'PaginatedResponse',
      'PublicAuthor',
    ]);
  });
});

describe('qualifyType', () => {
  it('префиксует имена бареля и не трогает встроенные', () => {
    expect(qualifyType('PaginatedResponse<PublicAuthor>', exported)).toBe(
      'T.PaginatedResponse<T.PublicAuthor>'
    );
    expect(qualifyType('string | null', exported)).toBe('string | null');
  });

  it('не префиксует ключ объекта, совпавший с именем бареля', () => {
    expect(qualifyType('{ ISODate: string }', exported)).toBe('{ ISODate: string }');
  });

  it('не трогает строковый литерал, совпавший с именем бареля', () => {
    expect(qualifyType("'ISODate' | PublicAuthor", exported)).toBe("'ISODate' | T.PublicAuthor");
  });
});

describe('selectCandidates', () => {
  const sites = [
    { file: 'api/a.ts', line: 10, type: 'PublicAuthor' },
    { file: 'api/b.ts', line: 20, type: '' },
    { file: 'api/c.ts', line: 30, type: 'void' },
    { file: 'api/d.ts', line: 40, type: 'LocalOnly' },
    { file: 'api/e.ts', line: 50, type: 'PublicAuthor' },
    { file: 'api/f.ts', line: 60, type: 'PublicAuthor' },
  ];

  const routeOf = (site: { file: string }) => {
    if (site.file === 'api/e.ts') return route({ hasResponseSchema: false, code: null });
    if (site.file === 'api/f.ts') return null;
    return route();
  };

  it('берёт только вызовы с именованным типом из бареля и схемой ответа', () => {
    const { candidates, skipped } = selectCandidates(sites, routeOf, exported);
    expect(candidates.map((c: { site: { file: string } }) => c.site.file)).toEqual(['api/a.ts']);
    const reasons = skipped.map((s: { reason: string }) => s.reason);
    expect(reasons).toContain('нет схемы ответа');
    expect(reasons.filter((r: string) => r === 'тип вызова не назван')).toHaveLength(2);
    expect(reasons.some((r: string) => r.startsWith('имена вне бареля'))).toBe(true);
  });

  it('вызов без маршрута в слой 2 не попадает вовсе - им занят слой 1', () => {
    const { candidates, skipped } = selectCandidates(sites, routeOf, exported);
    const seen = [...candidates, ...skipped].map((x: { site: { file: string } }) => x.site.file);
    expect(seen).not.toContain('api/f.ts');
  });
});

describe('buildAssertionSource', () => {
  const candidates = [
    { site: { file: 'api/a.ts', line: 10 }, route: route(), type: 'PublicAuthor' },
    {
      site: { file: 'api/b.ts', line: 20 },
      route: route({ key: 'GET /books', path: '/books', method: 'get', code: 200 }),
      type: 'PaginatedResponse<PublicAuthor>',
    },
  ];

  it('собирает утверждение на каждый вызов, с кодом ответа и адресом из схемы', () => {
    const { text, byId } = buildAssertionSource(candidates, exported);
    expect(text).toContain(
      "type R1 = paths['/uploads/presign']['post']['responses'][201]['content']['application/json'];"
    );
    expect(text).toContain('export const c1: T.PublicAuthor = null as unknown as R1;');
    expect(text).toContain(
      "type R2 = paths['/books']['get']['responses'][200]['content']['application/json'];"
    );
    expect(text).toContain(
      'export const c2: T.PaginatedResponse<T.PublicAuthor> = null as unknown as R2;'
    );
    expect(byId.get(1)).toMatchObject({
      route: 'POST /uploads/presign',
      file: 'api/a.ts',
      line: 10,
    });
  });
});

describe('parseDiagnostics', () => {
  const byId = new Map([
    [1, { route: 'POST /uploads/presign', file: 'api/a.ts', line: 10, type: 'PublicAuthor' }],
    [
      2,
      { route: 'GET /books', file: 'api/b.ts', line: 20, type: 'PaginatedResponse<PublicAuthor>' },
    ],
  ]);
  const source = [
    '// шапка',
    '// шапка',
    "import type { paths } from './schema';",
    "import type * as T from '@/types/api-schema';",
    '',
    'type R1 = X;',
    'export const c1: T.PublicAuthor = null as unknown as R1;',
    'type R2 = X;',
    'export const c2: T.PaginatedResponse<T.PublicAuthor> = null as unknown as R2;',
  ].join('\n');

  it('привязывает диагностику к маршруту по имени константы', () => {
    const output =
      "assert.ts(7,14): error TS2741: Property 'slug' is missing in type '{}' but required in type 'PublicAuthor'.";
    const { failed, unattributed } = parseDiagnostics(output, byId, source);
    expect(unattributed).toHaveLength(0);
    expect([...failed.keys()]).toEqual(['POST /uploads/presign']);
  });

  it('привязывает по номеру строки, когда имени константы в тексте нет', () => {
    const output = "assert.ts(9,14): error TS2322: Type 'A' is not assignable to type 'B'.";
    const { failed, unattributed } = parseDiagnostics(output, byId, source);
    expect(unattributed).toHaveLength(0);
    expect([...failed.keys()]).toEqual(['GET /books']);
  });

  it('непривязанную диагностику возвращает отдельно, а не считает зелёной', () => {
    const output = "assert.ts(3,1): error TS2307: Cannot find module './schema'.";
    const { failed, unattributed } = parseDiagnostics(output, byId, source);
    expect(failed.size).toBe(0);
    expect(unattributed).toHaveLength(1);
    expect(unattributed[0].code).toBe('TS2307');
  });

  it('многострочная диагностика остаётся одним блоком, а не рассыпается по строкам', () => {
    const output = [
      "assert.ts(7,14): error TS2322: Type 'A[]' is not assignable to type 'PublicAuthor[]'.",
      "  Type 'A' is not assignable to type 'PublicAuthor'.",
      "    Property 'slug' is missing in type 'A' but required in type 'PublicAuthor'.",
    ].join('\n');
    const { failed, unattributed } = parseDiagnostics(output, byId, source);
    expect(unattributed).toHaveLength(0);
    const entries = failed.get('POST /uploads/presign');
    expect(entries).toHaveLength(1);
    // Имя поля лежит в отступной части: срезанное до первой строки сообщение прячет причину.
    expect(entries?.[0].message).toContain("Property 'slug' is missing");
  });

  it('диагностика чужого файла не приписывается утверждению по номеру строки', () => {
    const output = "types/api-schema/tags.ts(7,3): error TS2551: Property 'x' does not exist.";
    const { failed, unattributed } = parseDiagnostics(output, byId, source);
    expect(failed.size).toBe(0);
    expect(unattributed).toHaveLength(1);
    expect(unattributed[0].file).toBe('types/api-schema/tags.ts');
  });

  it('пустой вывод компилятора - это ноль расхождений', () => {
    const { failed, unattributed } = parseDiagnostics('', byId, source);
    expect(failed.size).toBe(0);
    expect(unattributed).toHaveLength(0);
  });
});

describe('coveredRoutes и compareCoverage', () => {
  const byId = new Map([
    [1, { route: 'POST /uploads/presign', file: 'api/a.ts', line: 10, type: 'PublicAuthor' }],
    [
      2,
      { route: 'GET /books', file: 'api/b.ts', line: 20, type: 'PaginatedResponse<PublicAuthor>' },
    ],
  ]);

  it('покрытыми считает маршруты без единого красного утверждения', () => {
    const failed = new Map([
      [
        'GET /books',
        [{ id: 2, route: 'GET /books', file: 'api/b.ts', line: 20, type: 'X', message: 'нет' }],
      ],
    ]);
    expect(coveredRoutes(byId, failed)).toEqual(['POST /uploads/presign']);
  });

  it('регресс покрытого маршрута - красное, с местом вызова в причине', () => {
    const failed = new Map([
      [
        'POST /uploads/presign',
        [
          {
            id: 1,
            route: 'POST /uploads/presign',
            file: 'api/a.ts',
            line: 10,
            type: 'PublicAuthor',
            message: 'Property x is missing',
          },
        ],
      ],
    ]);
    const problems = compareCoverage(['POST /uploads/presign'], [], failed, byId);
    expect(problems).toHaveLength(1);
    expect(problems[0].detail).toContain('api/a.ts:10');
    expect(problems[0].detail).toContain('Property x is missing');
  });

  it('покрытый маршрут, выпавший из-под утверждений, - красное', () => {
    const problems = compareCoverage(['DELETE /gone'], [], new Map(), byId);
    expect(problems).toHaveLength(1);
    expect(problems[0].detail).toContain('выпал из-под утверждений');
  });

  it('новое покрытие мимо снимка - красное: иначе снимок отстаёт в сторону меньшего', () => {
    const problems = compareCoverage([], ['GET /books'], new Map(), byId);
    expect(problems).toHaveLength(1);
    expect(problems[0].detail).toContain('в снимке покрытия его нет');
  });

  it('снимок сошёлся с прогоном - расхождений нет', () => {
    const covered = ['GET /books', 'POST /uploads/presign'];
    expect(compareCoverage(covered, covered, new Map(), byId)).toEqual([]);
  });
});

/**
 * Бюджет вызовов, до утверждения не дошедших (решение арбитра 10.09.2026, вариант A).
 * Через CLI задеваются не все ветки: класс «тип вызова не назван» в песочнице не возникает,
 * а структурные случаи снимка - тем более. Здесь они проверяются напрямую.
 */
describe('outsideBudget', () => {
  it('разносит пропуски по трём классам, беря класс полем, а не разбором текста', () => {
    const budget = outsideBudget([
      { kind: 'noResponseSchema' },
      { kind: 'noResponseSchema' },
      { kind: 'unnamedCallType' },
      { kind: 'namesOutsideBarrel' },
      { kind: 'namesOutsideBarrel' },
    ]);

    expect(budget).toEqual({ noResponseSchema: 2, unnamedCallType: 1, namesOutsideBarrel: 2 });
  });

  it('неизвестный класс - отказ, а не тихий счёт в соседнюю графу', () => {
    expect(() => outsideBudget([{ kind: 'somethingNew' }])).toThrow(/неизвестный класс/);
  });

  it('на пустом списке даёт нули по всем классам, а не пустой объект', () => {
    // Пустой объект уехал бы в снимок и сделал бы `compareBudget` слепым к появлению класса.
    expect(outsideBudget([])).toEqual({
      noResponseSchema: 0,
      unnamedCallType: 0,
      namesOutsideBarrel: 0,
    });
  });
});

describe('compareBudget', () => {
  const same = { noResponseSchema: 1, unnamedCallType: 0, namesOutsideBarrel: 2 };

  it('совпадение молчит', () => {
    expect(compareBudget(same, { ...same })).toEqual([]);
  });

  it('рост называет класс и обе цифры', () => {
    const problems = compareBudget(same, { ...same, namesOutsideBarrel: 3 });

    expect(problems).toHaveLength(1);
    expect(problems[0].kind).toBe('namesOutsideBarrel');
    expect(problems[0].detail).toContain('было 2, стало 3');
    expect(problems[0].detail).toContain('добавлять молча нельзя');
  });

  it('снижение тоже красное и зовёт пересчитать снимок', () => {
    const problems = compareBudget(same, { ...same, namesOutsideBarrel: 1 });

    expect(problems).toHaveLength(1);
    expect(problems[0].detail).toContain('было 2, стало 1');
    expect(problems[0].detail).toContain('пересчитать снимок');
  });

  it('класса нет в снимке - красное: иначе новый класс пропусков появился бы молча', () => {
    const problems = compareBudget({ noResponseSchema: 1 }, same);

    expect(problems.map((p) => p.kind).sort()).toEqual(['namesOutsideBarrel', 'unnamedCallType']);
    expect(problems[0].detail).toContain('нет в снимке бюджета');
  });

  it('класс из снимка пропал из расчёта - тоже красное', () => {
    const problems = compareBudget(same, { noResponseSchema: 1, unnamedCallType: 0 });

    expect(problems).toHaveLength(1);
    expect(problems[0].kind).toBe('namesOutsideBarrel');
    expect(problems[0].detail).toContain('пропал из расчёта');
  });
});
