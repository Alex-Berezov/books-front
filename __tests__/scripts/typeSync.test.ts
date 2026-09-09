/**
 * Гейт type-sync (Q4, LEGACY-016/LEGACY-183).
 *
 * Проверяется не «скрипт запускается», а то, ради чего он заведён: пропажа поля
 * из ответа, потеря схемы и вызов в несуществующий маршрут обязаны краснеть.
 * Спека гоняет чистую логику и, отдельными случаями, сам CLI на испорченном входе -
 * с проверкой кода возврата и причины отказа.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  buildSurface,
  collectResponseFields,
  compareSurface,
  extractCallSites,
  indexApiPaths,
  normalizeApiPath,
  readArgument,
  resolveUrl,
  shouldAcceptUpdate,
  splitConditional,
  successResponseSchema,
} from '../../scripts/lib/type-sync.mjs';

const REPO_ROOT = resolve(__dirname, '../..');
const CLI = join(REPO_ROOT, 'scripts/check-type-sync.mjs');
const SCHEMA_COPY = join(REPO_ROOT, 'scripts/type-sync/api-schema.json');
const SURFACE_FILE = join(REPO_ROOT, 'scripts/type-sync/surface.json');

/** Разбирает адрес так же, как это делает гейт: по месту вызова в тексте файла. */
function urlOf(src: string): string | null {
  const [site] = extractCallSites(src);
  return resolveUrl(site.urlExpression, src, site.index);
}

describe('разбор вызовов http-клиента', () => {
  it('находит метод, тип и адрес', () => {
    const src = `httpGet<BookOverview>('/books/x', { language: 'en' });`;
    const [site] = extractCallSites(src);
    expect(site.method).toBe('get');
    expect(site.type).toBe('BookOverview');
    expect(urlOf(src)).toBe('/books/x');
  });

  it('видит форму с Auth и все глаголы', () => {
    const src = [
      `httpGetAuth<A>('/a');`,
      `httpPostAuth<B>('/b', d);`,
      `httpPatchAuth<C>('/c', d);`,
      `httpPutAuth<D>('/d', d);`,
      `httpDeleteAuth<E>('/e');`,
    ].join('\n');
    expect(extractCallSites(src).map((s) => s.method)).toEqual([
      'get',
      'post',
      'patch',
      'put',
      'delete',
    ]);
  });

  it('подстановку пути заменяет параметром', () => {
    expect(urlOf('httpGetAuth<T>(`/tags/${id}`);')).toBe('/tags/{p}');
  });

  it('строку запроса в путь не тащит', () => {
    expect(urlOf('httpGetAuth<T>(`/tags?${q.toString()}`);')).toBe('/tags');
  });

  it('видит вложенный обобщённый параметр', () => {
    const src = "httpGetAuth<PaginatedResponse<Author>>('/authors');";
    const [site] = extractCallSites(src);
    expect(site.type).toBe('PaginatedResponse<Author>');
    expect(urlOf(src)).toBe('/authors');
  });

  it('видит литеральный тип с точками с запятой внутри', () => {
    const src = "httpPostAuth<{ key: string; url: string }>('/uploads/presign', d);";
    const [site] = extractCallSites(src);
    expect(site.type).toBe('{ key: string; url: string }');
    expect(urlOf(src)).toBe('/uploads/presign');
  });

  it('видит вызов БЕЗ обобщённого параметра', () => {
    // Требование `<Тип>` делало невидимыми ручки, отдающие void, - и вместе с ними
    // вызов в маршрут, которого у бэкенда нет.
    const src = 'httpPostAuth(`/users/${id}/roles/${role}`, {});';
    const sites = extractCallSites(src);
    expect(sites).toHaveLength(1);
    expect(sites[0].type).toBe('');
    expect(urlOf(src)).toBe('/users/{p}/roles/{p}');
  });

  it('не принимает упоминание имени за вызов', () => {
    const src = "import { httpGetAuth } from '@/lib/http-client';";
    expect(extractCallSites(src)).toHaveLength(0);
  });

  it('адреса из комментариев за настоящие вызовы не принимает', () => {
    const src = [
      '/**',
      " * const x = await httpGet<T>('/en/books');",
      ' */',
      "httpGet<T>('/real');",
    ].join('\n');
    const sites = extractCallSites(src);
    expect(sites).toHaveLength(1);
    expect(urlOf(src)).toBe('/real');
  });

  it('шаблон внутри вызова не обрывает разбор аргумента', () => {
    // Общий счётчик скобок и подстановок дочитывал такой вызов до конца файла.
    const src = 'httpGetAuth<T>(`/a/${b}`, { requireAuth: false });\nhttpGetAuth<U>(`/c`);';
    expect(extractCallSites(src)).toHaveLength(2);
  });
});

describe('разрешение адреса через переменные и помощники', () => {
  it('идёт за идентификатором к его последнему присваиванию выше вызова', () => {
    const src = ['const endpoint = `/pages/${slug}`;', 'httpGetAuth<T>(endpoint);'].join('\n');
    expect(urlOf(src)).toBe('/pages/{p}');
  });

  it('берёт присваивание выше вызова, а не первое в файле', () => {
    const src = [
      'const endpoint = `/first`;',
      'httpGetAuth<T>(x);',
      'const endpoint2 = `/second`;',
      'httpGetAuth<T>(endpoint2);',
    ].join('\n');
    const sites = extractCallSites(src);
    expect(resolveUrl(sites[1].urlExpression, src, sites[1].index)).toBe('/second');
  });

  it('знает форму buildLangPath', () => {
    const src = [
      'const endpoint = buildLangPath(lang, `/books/${slug}/overview`);',
      'httpGet<T>(endpoint);',
    ].join('\n');
    expect(urlOf(src)).toBe('/{p}/books/{p}/overview');
  });

  it('подстановку, дающую только запрос, к пути не приписывает', () => {
    const src = "httpGetAuth<T>(`/categories/tree${qs ? `?${qs}` : ''}`);";
    expect(urlOf(src)).toBe('/categories/tree');
  });

  it('тернарник, обе ветви которого дают один путь, разрешает', () => {
    const src = [
      "const endpoint = q ? `/admin/pages?${q}` : '/admin/pages';",
      'httpGetAuth<T>(endpoint);',
    ].join('\n');
    expect(urlOf(src)).toBe('/admin/pages');
  });

  it('тернарник с разными путями не разрешает - это красное, а не догадка', () => {
    const src = ["const endpoint = q ? '/a' : '/b';", 'httpGetAuth<T>(endpoint);'].join('\n');
    expect(urlOf(src)).toBeNull();
  });

  it('тернарник с одной неразрешимой ветвью не разрешается по второй', () => {
    // Отбрасывание неразрешённой ветви делало гейт зелёным именно там, где адрес
    // собирается динамически: осталась бы одна ветвь и совпала бы сама с собой.
    const src = [
      "const endpoint = flag ? makeUrl(x) : '/known';",
      'httpGetAuth<T>(endpoint);',
    ].join('\n');
    expect(urlOf(src)).toBeNull();
  });

  it('вычисляемый адрес остаётся неразрешённым', () => {
    const src = 'httpGetAuth<T>(makeUrl(a, b));';
    expect(urlOf(src)).toBeNull();
  });

  it('не режет `?.` как тернарник', () => {
    expect(splitConditional('a?.b')).toBeNull();
    expect(splitConditional('a ?? b')).toBeNull();
    expect(splitConditional("q ? '/a' : '/b'")).toEqual(["'/a'", "'/b'"]);
  });

  it('аргумент читается до запятой и точки с запятой верхнего уровня', () => {
    expect(readArgument('f(a, b)', 2)).toBe('a');
    expect(readArgument('const x = `/a`;\nnext();', 10)).toBe('`/a`');
  });
});

describe('поля ответа', () => {
  const doc = {
    paths: {},
    components: {
      schemas: {
        Item: {
          properties: {
            id: { type: 'string' },
            autoIndexable: { type: 'boolean' },
            nested: { properties: { deep: { type: 'string' } } },
          },
        },
        List: {
          properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Item' } } },
        },
      },
    },
  };

  it('собирает вложенные поля точечными путями', () => {
    const fields = [...collectResponseFields({ $ref: '#/components/schemas/List' }, doc)].sort();
    expect(fields).toContain('data[].autoIndexable');
    expect(fields).toContain('data[].nested.deep');
  });

  it('не зацикливается на самоссылающейся схеме', () => {
    const cyclic = {
      paths: {},
      components: {
        schemas: { Node: { properties: { id: {}, child: { $ref: '#/components/schemas/Node' } } } },
      },
    };
    const fields = [...collectResponseFields({ $ref: '#/components/schemas/Node' }, cyclic)];
    expect(fields).toContain('id');
  });

  it('берёт схему ответа 200 и 201, а без content отдаёт null', () => {
    expect(
      successResponseSchema({
        responses: { 200: { content: { 'application/json': { schema: {} } } } },
      })?.code
    ).toBe(200);
    expect(
      successResponseSchema({
        responses: { 201: { content: { 'application/json': { schema: {} } } } },
      })?.code
    ).toBe(201);
    expect(successResponseSchema({ responses: { 200: { description: '' } } })).toBeNull();
  });

  it('путь схемы приводится к той же форме, что и адрес вызова', () => {
    expect(normalizeApiPath('/tags/{id}')).toBe('/tags/{p}');
    expect(indexApiPaths({ paths: { '/tags/{id}': {} } }).get('/tags/{p}')).toBe('/tags/{id}');
  });
});

describe('сверка поверхности', () => {
  const base = [
    { route: 'GET /tags', hasResponseSchema: true, fields: ['data[].id', 'data[].autoIndexable'] },
  ];

  it('на совпадении молчит', () => {
    expect(compareSurface({ routes: base }, { routes: base })).toEqual([]);
  });

  it('краснеет на пропавшем поле - это инцидент LEGACY-183', () => {
    const now = [{ route: 'GET /tags', hasResponseSchema: true, fields: ['data[].id'] }];
    const problems = compareSurface({ routes: base }, { routes: now });
    expect(problems).toHaveLength(1);
    expect(problems[0].kind).toBe('field-gone');
    expect(problems[0].detail).toContain('autoIndexable');
  });

  it('краснеет на потерянной схеме ответа', () => {
    const now = [{ route: 'GET /tags', hasResponseSchema: false, fields: [] }];
    expect(compareSurface({ routes: base }, { routes: now }).map((p) => p.kind)).toContain(
      'schema-lost'
    );
  });

  it('краснеет на пропавшем маршруте', () => {
    expect(compareSurface({ routes: base }, { routes: [] })[0].kind).toBe('route-gone');
  });

  it('краснеет и на новом поле: снимок обязан пересчитываться тем же прогоном', () => {
    const now = [
      { route: 'GET /tags', hasResponseSchema: true, fields: [...base[0].fields, 'data[].extra'] },
    ];
    expect(compareSurface({ routes: base }, { routes: now }).map((p) => p.kind)).toContain(
      'field-new'
    );
  });

  it('краснеет на маршруте, которого нет в снимке', () => {
    const now = [...base, { route: 'GET /new', hasResponseSchema: false, fields: [] }];
    expect(compareSurface({ routes: base }, { routes: now }).map((p) => p.kind)).toContain(
      'route-new'
    );
  });
});

describe('поверхность по вызовам', () => {
  const doc = {
    paths: {
      '/tags/{id}': {
        get: {
          responses: {
            200: { content: { 'application/json': { schema: { properties: { id: {} } } } } },
          },
        },
      },
      '/plain': { get: { responses: { 200: { description: '' } } } },
    },
    components: { schemas: {} },
  };

  it('маршрут без схемы ответа попадает в снимок с пустыми полями, а не выпадает', () => {
    const surface = buildSurface(
      [
        { method: 'get', url: '/tags/{p}', file: 'a.ts', line: 1 },
        { method: 'get', url: '/plain', file: 'a.ts', line: 2 },
      ],
      doc
    );
    expect(surface.routes.find((r) => r.route === 'GET /plain')).toEqual({
      route: 'GET /plain',
      hasResponseSchema: false,
      fields: [],
    });
    expect(surface.routes.find((r) => r.route === 'GET /tags/{id}')?.fields).toEqual(['id']);
  });

  it('неразрешённый адрес и неизвестный маршрут копятся отдельно', () => {
    const surface = buildSurface(
      [
        { method: 'get', url: null, file: 'a.ts', line: 1 },
        { method: 'get', url: '/nope', file: 'a.ts', line: 2 },
      ],
      doc
    );
    expect(surface.unresolved).toHaveLength(1);
    expect(surface.unknownRoutes).toHaveLength(1);
  });
});

describe('обновление снимка', () => {
  it('вне CI по флагу разрешено, в CI - нет', () => {
    expect(shouldAcceptUpdate(true, false)).toBe(true);
    expect(shouldAcceptUpdate(true, true)).toBe(false);
    expect(shouldAcceptUpdate(false, false)).toBe(false);
    expect(shouldAcceptUpdate(false, true)).toBe(false);
  });
});

describe('гейт целиком на испорченном входе', () => {
  /**
   * Песочница синтетическая и намеренно мелкая: проверяется поведение скрипта,
   * а не содержимое настоящего снимка - его стережёт сам гейт в `yarn ci`.
   * Копировать боевые каталоги сюда нельзя: под полным прогоном это десятки секунд
   * на каждый случай, и тесты падали по таймауту, ничего не проверив.
   */
  const SAMPLE_SOURCE = [
    "import { httpGetAuth, httpDeleteAuth } from '@/lib/http-client';",
    '',
    "export const list = () => httpGetAuth<Thing[]>('/thing');",
    'export const drop = (id: string) => httpDeleteAuth(`/thing/${id}`);',
  ].join('\n');

  const sampleSchema = () => ({
    openapi: '3.0.0',
    paths: {
      '/thing': {
        get: {
          responses: {
            200: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Thing' } } },
            },
          },
        },
      },
      '/thing/{id}': { delete: { responses: { 200: { description: '' } } } },
    },
    components: {
      schemas: { Thing: { properties: { id: { type: 'string' }, name: { type: 'string' } } } },
    },
  });

  /** Готовая песочница со снятым снимком: дальше её вход портят и гоняют гейт снова. */
  /**
   * Песочница одна на весь блок: раньше каждый случай копировал `scripts/lib`
   * заново, и под полным прогоном эта спека отнимала столько процессора, что
   * соседний тяжёлый файл начинал падать по таймауту. Схема возвращается
   * в исходное состояние после каждого случая - изоляция от этого не страдает.
   */
  let box: {
    base: string;
    dir: string;
    neighbourDir: string;
    schema: string;
    surface: string;
  };
  let pristineSchema: string;
  let pristineSurface: string;

  beforeAll(() => {
    const base = mkdtempSync(join(tmpdir(), 'type-sync-'));
    const dir = join(base, 'books-front');
    mkdirSync(join(dir, 'scripts/type-sync'), { recursive: true });
    mkdirSync(join(dir, 'api/endpoints'), { recursive: true });
    cpSync(join(REPO_ROOT, 'scripts/lib'), join(dir, 'scripts/lib'), { recursive: true });
    cpSync(CLI, join(dir, 'scripts/check-type-sync.mjs'));
    writeFileSync(join(dir, 'api/endpoints/sample.ts'), SAMPLE_SOURCE);
    box = {
      base,
      dir,
      neighbourDir: join(base, 'books'),
      schema: join(dir, 'scripts/type-sync/api-schema.json'),
      surface: join(dir, 'scripts/type-sync/surface.json'),
    };
    writeFileSync(box.schema, JSON.stringify(sampleSchema(), null, 2));

    // Снимок кладётся той же чистой логикой, что и в бою, но без запуска процесса.
    const src = readFileSync(join(box.dir, 'api/endpoints/sample.ts'), 'utf8');
    const sites = extractCallSites(src).map((site) => ({
      ...site,
      file: 'api/endpoints/sample.ts',
      url: resolveUrl(site.urlExpression, src, site.index),
    }));
    const surface = buildSurface(sites, JSON.parse(readFileSync(box.schema, 'utf8')));
    expect(surface.unresolved).toHaveLength(0);
    expect(surface.unknownRoutes).toHaveLength(0);
    writeFileSync(box.surface, `${JSON.stringify(surface.routes, null, 2)}\n`, 'utf8');

    pristineSchema = readFileSync(box.schema, 'utf8');
    pristineSurface = readFileSync(box.surface, 'utf8');
  });

  afterEach(() => {
    writeFileSync(box.schema, pristineSchema);
    writeFileSync(box.surface, pristineSurface);
    writeFileSync(join(box.dir, 'api/endpoints/sample.ts'), SAMPLE_SOURCE);
    rmSync(box.neighbourDir, { recursive: true, force: true });
  });

  afterAll(() => {
    rmSync(box.base, { recursive: true, force: true });
  });

  /** Сосед нужен только случаям про обновление и сверку копии. */
  function addNeighbour(schema: unknown) {
    const dir = join(box.neighbourDir, 'libs/api-client');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'api-schema.json'), JSON.stringify(schema, null, 2));
  }

  function runGate(args: string[] = [], env: Record<string, string> = {}) {
    try {
      const stdout = execFileSync(
        process.execPath,
        [join(box.dir, 'scripts/check-type-sync.mjs'), ...args],
        {
          encoding: 'utf8',
          env: { ...process.env, ...env },
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
      return { code: 0, output: stdout };
    } catch (error) {
      const failure = error as { status: number; stdout: string; stderr: string };
      return { code: failure.status, output: `${failure.stdout}${failure.stderr}` };
    }
  }

  /** Портит схему и возвращает результат обычного прогона. */
  function afterMutation(mutate: (schema: string) => void) {
    mutate(box.schema);
    return runGate();
  }

  it('на чистом входе зелёный и говорит, что сверял', () => {
    const run = runGate();
    expect(run.code).toBe(0);
    expect(run.output).toContain('сходятся со снимком');
    // Соседа рядом с песочницей нет - пропуск кросс-репо сверки обязан быть назван.
    expect(run.output).toContain('SKIPPED');
  });

  it('пропажа поля из схемы роняет прогон и называет поле', () => {
    const run = afterMutation((schema) => {
      const doc = JSON.parse(readFileSync(schema, 'utf8'));
      delete doc.components.schemas.Thing.properties.name;
      writeFileSync(schema, JSON.stringify(doc));
    });
    expect(run.code).toBe(1);
    expect(run.output).toContain('поле ответа пропало');
    expect(run.output).toContain('name');
  });

  it('снятая схема ответа роняет прогон', () => {
    const run = afterMutation((schema) => {
      const doc = JSON.parse(readFileSync(schema, 'utf8'));
      delete doc.paths['/thing'].get.responses['200'].content;
      writeFileSync(schema, JSON.stringify(doc));
    });
    expect(run.code).toBe(1);
    expect(run.output).toContain('схема ответа');
  });

  it('снятый маршрут роняет прогон', () => {
    const run = afterMutation((schema) => {
      const doc = JSON.parse(readFileSync(schema, 'utf8'));
      delete doc.paths['/thing'];
      writeFileSync(schema, JSON.stringify(doc));
    });
    expect(run.code).toBe(1);
    expect(run.output).toContain('нет в схеме бэкенда');
  });

  it('обрезанная схема роняет прогон, а не считает ноль маршрутов нормой', () => {
    const run = afterMutation((schema) =>
      writeFileSync(schema, JSON.stringify({ openapi: '3.0.0', paths: {} }))
    );
    expect(run.code).toBe(1);
    expect(run.output).toContain('ни одного маршрута');
  });

  it('битый JSON схемы роняет прогон', () => {
    const run = afterMutation((schema) => writeFileSync(schema, '{ not json'));
    expect(run.code).toBe(1);
    expect(run.output).toContain('не разбирается');
  });

  it('--update под CI снимок не переписывает и сверку не глушит', () => {
    addNeighbour(sampleSchema());
    const committed = JSON.parse(readFileSync(box.surface, 'utf8'));
    committed[0].fields.push('поле-которого-нет');
    writeFileSync(box.surface, JSON.stringify(committed, null, 2));
    const before = readFileSync(box.surface, 'utf8');

    const run = runGate(['--update'], { CI: 'true' });

    expect(run.code).toBe(1);
    expect(run.output).toContain('поле-которого-нет');
    expect(readFileSync(box.surface, 'utf8')).toBe(before);
  });

  it('обновление называет расхождение словами до перезаписи снимка', () => {
    const drifted = sampleSchema();
    delete (drifted.components.schemas.Thing.properties as Record<string, unknown>).name;
    addNeighbour(drifted);

    const run = runGate(['--update']);

    expect(run.code).toBe(0);
    expect(run.output).toContain('поле ответа пропало');
    expect(run.output).toContain('name');
  });

  it('вызов в маршрут, которого нет в схеме, роняет прогон', () => {
    writeFileSync(
      join(box.dir, 'api/endpoints/sample.ts'),
      `${SAMPLE_SOURCE}\nexport const gone = () => httpGetAuth<T>('/no-such-route');`
    );

    const run = runGate();

    expect(run.code).toBe(1);
    expect(run.output).toContain('/no-such-route');
    expect(run.output).toContain('нет в схеме бэкенда');
  });
});

describe('привязка гейта к конвейеру', () => {
  it('шаг стоит в yarn ci, а не только в отдельной команде', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.ci).toContain('yarn check:type-sync');
    expect(pkg.scripts['check:type-sync']).toBe('node scripts/check-type-sync.mjs');
  });

  it('под охрану попали вызовы вне api/ - иначе зелёная строка шире правды', () => {
    // Оба маршрута зовутся не из api/endpoints: `slug-redirect` - из lib/seo/retired-slug.ts,
    // регистрация - со страницы app/[lang]/auth/register.
    const surface = JSON.parse(readFileSync(SURFACE_FILE, 'utf8')) as { route: string }[];
    const routes = surface.map((r) => r.route);
    expect(routes).toContain('GET /{lang}/slug-redirect');
    expect(routes).toContain('POST /auth/register');
  });

  it('боевой прогон по самому репозиторию зелёный', () => {
    // Снимок сверяется с тем, что гейт вычисляет по настоящему дереву. Сузь обход
    // (например обратно до api) - маршруты со страниц и из lib пропадут из расчёта,
    // и этот прогон покраснеет на «маршрут есть в снимке, но фронт его больше не зовёт».
    const output = execFileSync(process.execPath, [CLI], { cwd: REPO_ROOT, encoding: 'utf8' });
    expect(output).toContain('сходятся со снимком');
  });

  it('копия схемы совпадает со снимком бэкенда байт в байт, когда сосед на месте', () => {
    const neighbour = resolve(REPO_ROOT, '../books/libs/api-client/api-schema.json');
    let original: string;
    try {
      original = readFileSync(neighbour, 'utf8');
    } catch {
      return; // соседа рядом нет - сверку ведёт сам гейт при каждом прогоне
    }
    expect(readFileSync(SCHEMA_COPY, 'utf8')).toBe(original);
  });
});
