// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 LEGACY-288. Набор e2e гонялся против боевого API. Пять спек подряд с одного адреса
 * выбирали рейт-лимит периметра, дальше любой серверный рендер получал `429`, страница
 * отдавала `app/error.tsx` — заголовок на ней есть, панели инструментов нет, — и спека
 * краснела каждый раз в разном тесте. `main` стоял красным при исправном коде.
 *
 * Сторож держит четыре вещи, каждая из которых по отдельности возвращает тот же отказ:
 * адрес API в сборке не боевой, бэкенд поднимается свой, готовность проверяется по телу
 * ответа, ожидание падает по таймауту. Проверяется текст конвейера, потому что проверять
 * тут больше нечего: шаг исполняется только на раннере, и в рабочем дереве его поведения
 * не наблюдать.
 *
 * 🔴 Каждая проверка смотрит ТЕЛО своего шага, а не весь файл. Первая редакция сторожа
 * искала подстроки по всему `ci.yml` и потому удовлетворялась текстом комментариев:
 * замером подтверждено, что при подмене настоящей пробы готовности на проверку по коду
 * ответа — ровно тот дефект, ради которого сторож заведён, — проверка оставалась зелёной,
 * потому что искомое находилось в комментарии строкой выше.
 */

const CI_WORKFLOW = resolve(__dirname, '..', '.github', 'workflows', 'ci.yml');
const workflow = readFileSync(CI_WORKFLOW, 'utf8');

/**
 * Тело шага по началу его имени: от строки `- name: <имя>` до следующего такого же.
 *
 * ⚠️ Разбор текстовый и держится на отступе в шесть пробелов — отступе шага внутри
 * `jobs.<job>.steps`. Парсер YAML был бы прочнее, но `yaml` прямой зависимостью
 * репозитория не объявлен, а её добавление запрещено п.4 `CLAUDE.md` без разрешения.
 * Поэтому проверки, которым нужен шаг, требуют его существования отдельным `toBeDefined`
 * с внятным сообщением: сломается разбор — будет видно, что сломался разбор.
 */
const stepBody = (nameStartsWith: string): string | undefined =>
  workflow
    .split(/^ {6}- name: /m)
    .slice(1)
    .find((step) => step.startsWith(nameStartsWith));

/**
 * Разбор таблиц приёмочных спек для сверки с пробой данных: один на блоки F03-4 и F04-4 (L-017,
 * одно понятие - один разборщик). Слаги - объект `SLUG` спеки (ключ → слаг с префиксом), таблица -
 * от `const <NAME>` (целым словом: `READER`, а не `READER_CHAPTERS`) до первого `];`, элементы
 * цикла пробы - список после `for <var> in` до `; do`.
 */
const acceptanceSlugs = (source: string, prefix: string) =>
  Object.fromEntries(
    [...source.matchAll(new RegExp(`^ {2}(\\w+): '(${prefix}-[a-z0-9-]+)',$`, 'gm'))].map(
      ([, key, slug]) => [key, slug]
    )
  );
const specTable = (source: string, name: string) => {
  const at = source.search(new RegExp(`const ${name}\\b`));
  return at === -1 ? '' : source.slice(at, source.indexOf('];', at));
};
const probeLoopItems = (source: string, loopVar: string) =>
  (source.match(new RegExp(`for ${loopVar} in ([^;]+); do`))?.[1] ?? '')
    .split(/[\s\\]+/)
    .filter(Boolean)
    .sort();

describe('конвейер CI: e2e гоняются против своего бэкенда, а не против прода', () => {
  it('адрес API в сборке не указывает на боевой хост', () => {
    const build = stepBody('Build');
    expect(build, 'шаг Build не найден — сломался разбор конвейера').toBeDefined();

    const apiBaseUrl = build?.match(/NEXT_PUBLIC_API_BASE_URL:\s*(\S+)/)?.[1];
    expect(apiBaseUrl, 'шаг Build не задаёт NEXT_PUBLIC_API_BASE_URL').toBeDefined();
    expect(apiBaseUrl).not.toMatch(/api\.bibliaris\.com/);
    expect(apiBaseUrl).toMatch(/^http:\/\/127\.0\.0\.1:5000\//);
  });

  /**
   * ⚠️ Именно шаг сборки, а не шаг e2e: `NEXT_PUBLIC_API_BASE_URL` подставляется литералом
   * на `next build` — и в клиентский бандл, и в серверный, — поэтому `env:` любого более
   * позднего шага на него уже не влияет. Такой блок и висел на шаге e2e, ничего не задавая
   * (`LEGACY-291`).
   *
   * ⚠️ Проверка сознательно сужена до одного имени, а не запрещает любой `NEXT_PUBLIC_*`:
   * `next.config.js` перечитывается при `next start` и берёт из окружения
   * `NEXT_PUBLIC_MEDIA_CDN_URL` для `images.remotePatterns`. Запрет на всё семейство
   * закрыл бы дорогу переменной, которая на этом шаге как раз работает.
   */
  it('шаг e2e не притворяется, будто задаёт адрес API', () => {
    const e2e = stepBody('E2E');
    expect(e2e, 'шаг E2E не найден — сломался разбор конвейера').toBeDefined();
    expect(e2e).not.toMatch(/NEXT_PUBLIC_API_BASE_URL/);
  });

  it('бэкенд поднимается свой, из образа релиза', () => {
    const start = stepBody('Start the backend');
    expect(start, 'шаг подъёма бэкенда не найден').toBeDefined();
    expect(start).toMatch(/docker run\b/);
    expect(start).toMatch(/ghcr\.io\/alex-berezov\/books:latest/);
  });

  it('под бэкенд поднимается база', () => {
    const services = workflow.match(/^ {4}services:$[\s\S]*?^ {4}steps:$/m)?.[0];
    expect(services, 'блок services не найден').toBeDefined();
    expect(services).toMatch(/image:\s*postgres:/);
  });

  /**
   * ⚠️ `/api/health/readiness` отдаёт `200` всегда, а состояние кладёт в тело.
   * Проба по коду ответа зелёная и у мёртвой базы, то есть покраснеть не способна.
   */
  it('готовность бэкенда проверяется по телу ответа, а не по коду', () => {
    const wait = stepBody('Wait until the backend is ready');
    expect(wait, 'шаг ожидания готовности не найден').toBeDefined();
    expect(wait).toMatch(/api\/health\/readiness/);
    expect(wait).toMatch(/"status":"up"/);
  });

  /**
   * ⚠️ `readiness` проверяет соединение запросом `SELECT 1`, а тот проходит и на пустой
   * схеме, тогда как энтрипойнт образа глушит отказ `prisma migrate deploy` и стартует
   * всё равно. Без этой пробы ненакаченные миграции вылезли бы на пререндере в `yarn build`.
   */
  it('проверяется не только соединение, но и наличие схемы', () => {
    const wait = stepBody('Wait until the backend is ready');
    expect(wait, 'шаг ожидания готовности не найден').toBeDefined();
    expect(wait).toMatch(/api\/en\/authors/);
  });

  /**
   * ⚠️ Адрес поднятого бэкенда записан двумя независимыми строками — пробой готовности
   * и `NEXT_PUBLIC_API_BASE_URL` шага сборки. Разъедутся они молча: проба дождётся
   * готовности на одном адресе, сборка впечёт другой, и прогон покраснеет спеками
   * с «локатор не найден» — тем самым симптомом, ради которого шаг ожидания и заведён.
   */
  it('проба готовности и сборка смотрят на один и тот же адрес', () => {
    const wait = stepBody('Wait until the backend is ready');
    const build = stepBody('Build');
    expect(wait, 'шаг ожидания готовности не найден').toBeDefined();
    expect(build, 'шаг Build не найден').toBeDefined();

    const probeOrigin = wait?.match(/https?:\/\/[^/\s]+/)?.[0];
    const buildOrigin = build?.match(/NEXT_PUBLIC_API_BASE_URL:\s*(https?:\/\/[^/\s]+)/)?.[1];

    expect(probeOrigin, 'в шаге ожидания нет адреса').toBeDefined();
    expect(buildOrigin, 'в шаге Build нет адреса API').toBeDefined();
    expect(buildOrigin).toBe(probeOrigin);
  });

  it('ожидание готовности падает по таймауту, а не идёт дальше', () => {
    const wait = stepBody('Wait until the backend is ready');
    expect(wait, 'шаг ожидания готовности не найден').toBeDefined();
    expect(wait).toMatch(/exit 1/);
  });

  /**
   * 🔴 Данные под e2e (`LEGACY-294`). База в конвейере пустая по устройству: энтрипойнт
   * образа накатывает миграции и сид не зовёт. Пока шага сида не было, спека хаба авторов
   * выходила ранней веткой и прогон зеленел, ничего не проверив.
   *
   * Проверяются оба шага, и порознь они бесполезны: сид без пробы возвращает ноль и на
   * устаревшем образе (авторов в старом сиде нет вовсе), а проба без сида проверяла бы
   * пустую базу.
   */
  it('база под e2e засевается, а не остаётся пустой', () => {
    const seed = stepBody('Seed the backend database');
    expect(seed, 'шаг сида не найден — сломался разбор конвейера').toBeDefined();
    expect(seed).toMatch(/docker exec books-api/);
    expect(seed).toMatch(/prisma db seed/);
  });

  /**
   * ⚠️ Проба обязана смотреть на ДАННЫЕ, а не на код возврата сида. Образ берётся тегом
   * `latest`: пока релиз бэкенда с новым сидом не доехал, `db seed` отработает старой
   * версией, вернёт ноль и авторов не создаст. Без пробы отказ вылез бы внутри спеки
   * playwright и читался бы как поломка фронта.
   */
  it('после сида проверяется, что данные доехали до API', () => {
    const probe = stepBody('The seeded data actually arrived');
    expect(probe, 'шаг пробы на данные не найден').toBeDefined();
    expect(probe).toMatch(/authors\/letters/);
    expect(probe).toMatch(/exit 1/);
    // Группа `#` из счёта исключена: ссылку на неё указатель рисует и тогда,
    // когда перехода по настоящей букве на странице нет.
    expect(probe).toMatch(/letter != "#"/);
  });

  /**
   * F03-4: проба проверяет ровно те тройки «язык/книга/счётчик анализов», которые открывает
   * спека (таблица `OPENED`). Тройка спеки без пары в пробе - на устаревшем образе спека
   * покраснела бы «404» с причиной в чужом репозитории; расхождение счётчика - проба красила бы
   * исправный образ или пропускала бы отсутствие данных.
   */
  describe('проба = тройки приёмки анализа из e2e/book-analysis.spec.ts', () => {
    const spec = readFileSync(resolve(__dirname, '..', 'e2e', 'book-analysis.spec.ts'), 'utf8');
    const probe = stepBody('The seeded data actually arrived') ?? '';

    const specTriples = (source: string) => {
      const slugs = acceptanceSlugs(source, 'analysis-acceptance');
      return [...specTable(source, 'OPENED').matchAll(/\['(\w{2})', SLUG\.(\w+), ([01])\]/g)]
        .map(([, lang, key, count]) => `${lang}/${slugs[key]}/${count}`)
        .sort();
    };
    const probeTriples = (source: string) => probeLoopItems(source, 'triple');

    it('чистый вход: тройки совпадают', () => {
      expect(specTriples(spec).length).toBeGreaterThan(0);
      expect(specTriples(spec).every((t) => !t.includes('undefined'))).toBe(true);
      expect(probeTriples(probe)).toEqual(specTriples(spec));
    });

    it.each([
      [
        'счётчик',
        (s: string) =>
          s.replace('es/analysis-acceptance-two-langs/0', 'es/analysis-acceptance-two-langs/1'),
      ],
      [
        'язык',
        (s: string) =>
          s.replace('ru/analysis-acceptance-no-core/0', 'pt/analysis-acceptance-no-core/0'),
      ],
      ['пропущенная тройка', (s: string) => s.replace('en/analysis-acceptance-minimal/1 ', '')],
    ])('испорченная проба (%s) - расхождение видно', (_name, spoil) => {
      const spoiled = spoil(probe);
      expect(spoiled).not.toBe(probe);
      expect(probeTriples(spoiled)).not.toEqual(specTriples(spec));
    });

    // Вторая половина пробы - число номеров глав анализа; в спеке те же числа (`CHAPTERS`).
    const specChapters = (source: string) => {
      const table = source.match(/const CHAPTERS = \{ full: (\d+), noChapters: (\d+) \}/);
      return table
        ? [`analysis-acceptance-full/${table[1]}`, `analysis-acceptance-no-chapters/${table[2]}`]
        : [];
    };
    const probeChapters = (source: string) => probeLoopItems(source, 'analysis_pair');

    it('чистый вход: число глав в пробе = CHAPTERS спеки', () => {
      expect(specChapters(spec)).toHaveLength(2);
      expect(probeChapters(probe)).toEqual([...specChapters(spec)].sort());
    });

    it('испорченная проба (число глав) - расхождение видно', () => {
      const spoiled = probe.replace('analysis-acceptance-full/4', 'analysis-acceptance-full/3');
      expect(spoiled).not.toBe(probe);
      expect(probeChapters(spoiled)).not.toEqual([...specChapters(spec)].sort());
    });
  });

  /**
   * F04-4: проба проверяет ровно те четвёрки «язык/книга/пересказ/разделов», пары очень краткого
   * и тройки главы читалки, которые открывает спека (таблицы `OPENED`, `BRIEF`, `READER`). Строка
   * спеки без пары в пробе - на устаревшем образе спека покраснела бы «404» с причиной в чужом
   * репозитории; расхождение счётчика - проба красила бы исправный образ или пропускала бы
   * отсутствие данных.
   */
  describe('проба = данные приёмки вариантов пересказа из e2e/book-summary-variants.spec.ts', () => {
    const spec = readFileSync(
      resolve(__dirname, '..', 'e2e', 'book-summary-variants.spec.ts'),
      'utf8'
    );
    const probe = stepBody('The seeded data actually arrived') ?? '';

    const slugsOf = (source: string) => acceptanceSlugs(source, 'summary-acceptance');

    const specQuads = (source: string) => {
      const slugs = slugsOf(source);
      return [...specTable(source, 'OPENED').matchAll(/\['(\w{2})', SLUG\.(\w+), ([01]), (\d+)\]/g)]
        .map(
          ([, lang, key, summaries, sections]) => `${lang}/${slugs[key]}/${summaries}/${sections}`
        )
        .sort();
    };
    const probeQuads = (source: string) => probeLoopItems(source, 'quad');

    const specBrief = (source: string) => {
      const slugs = slugsOf(source);
      return [...specTable(source, 'BRIEF').matchAll(/\[SLUG\.(\w+), ([01])\]/g)]
        .map(([, key, want]) => `${slugs[key]}/${want}`)
        .sort();
    };
    const probeBrief = (source: string) => probeLoopItems(source, 'brief_pair');

    const specReader = (source: string) => {
      const slugs = slugsOf(source);
      return [...specTable(source, 'READER').matchAll(/\[SLUG\.(\w+), (\d+), (true|false)\]/g)]
        .map(([, key, n, want]) => `${slugs[key]}/${n}/${want}`)
        .sort();
    };
    const probeReader = (source: string) => probeLoopItems(source, 'reader_triple');

    // Дата пересказа, которую спека ждёт в `dateModified`, = дата, которую проба требует от сида.
    const specSummaryDate = (source: string) =>
      source.match(/^const SUMMARY_DATE = '([^']+)';$/m)?.[1];
    // Дата задана в пробе один раз, переменной `summary_date`: её берут и `jq`, и текст ошибки.
    const probeSummaryDate = (source: string) =>
      /--arg date "\$summary_date" '\.briefHasText/.test(source)
        ? source.match(/^\s*summary_date=(\S+)$/m)?.[1]
        : undefined;

    it('чистый вход: четвёрки, пары и тройки совпадают', () => {
      expect(specQuads(spec).length).toBeGreaterThan(0);
      expect(specQuads(spec).every((row) => !row.includes('undefined'))).toBe(true);
      expect(probeQuads(probe)).toEqual(specQuads(spec));

      expect(specBrief(spec).length).toBeGreaterThan(0);
      expect(specBrief(spec).every((row) => !row.includes('undefined'))).toBe(true);
      expect(probeBrief(probe)).toEqual(specBrief(spec));

      expect(specReader(spec).length).toBeGreaterThan(0);
      expect(specReader(spec).every((row) => !row.includes('undefined'))).toBe(true);
      expect(probeReader(probe)).toEqual(specReader(spec));

      expect(specSummaryDate(spec)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(probeSummaryDate(probe)).toBe(specSummaryDate(spec));
    });

    it('испорченная проба (дата пересказа) - расхождение видно', () => {
      const spoiled = probe.replace('2026-03-10T09:30:00.000Z', '2026-03-11T09:30:00.000Z');
      expect(spoiled).not.toBe(probe);
      expect(probeSummaryDate(spoiled)).not.toBe(specSummaryDate(spec));
    });

    it.each([
      [
        'счётчик разделов',
        (s: string) =>
          s.replace('ru/summary-acceptance-full/1/4', 'ru/summary-acceptance-full/1/3'),
        probeQuads,
        specQuads,
      ],
      [
        'язык',
        (s: string) =>
          s.replace('pt/summary-acceptance-full/1/2', 'es/summary-acceptance-full/1/2'),
        probeQuads,
        specQuads,
      ],
      [
        'пропущенная четвёрка',
        (s: string) => s.replace('en/summary-acceptance-noindex/1/2 ', ''),
        probeQuads,
        specQuads,
      ],
      [
        'пара очень краткого',
        (s: string) =>
          s.replace('summary-acceptance-brief-only/1 ', 'summary-acceptance-brief-only/0 '),
        probeBrief,
        specBrief,
      ],
      [
        'тройка главы читалки',
        (s: string) =>
          s.replace('summary-acceptance-full/3/false', 'summary-acceptance-full/3/true'),
        probeReader,
        specReader,
      ],
    ])('испорченная проба (%s) - расхождение видно', (_name, spoil, fromProbe, fromSpec) => {
      const spoiled = spoil(probe);
      expect(spoiled).not.toBe(probe);
      expect(fromProbe(spoiled)).not.toEqual(fromSpec(spec));
    });
  });

  /**
   * Порядок шагов, а не только их наличие. Сид до готовности бэкенда упадёт на
   * неподнятом контейнере, а после сборки — не повлияет на пререндер, который ходит
   * в API на том же прогоне.
   */
  it('сид стоит после ожидания готовности и до сборки', () => {
    const order = ['Wait until the backend is ready', 'Seed the backend database', 'Build'];
    const positions = order.map((name) => workflow.indexOf(`- name: ${name}`));

    for (const [i, pos] of positions.entries()) {
      expect(pos, `шаг «${order[i]}» не найден`).toBeGreaterThan(-1);
    }
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[1]).toBeLessThan(positions[2]);
  });

  /**
   * Отдельно от адреса: конвейер правится только в сторону усиления. Ослабление любым
   * из этих способов оставляет шаг зелёным при настоящем падении — ровно так уезжали
   * релизы мимо проверки (`LEGACY-078`, `LEGACY-207`, `LEGACY-209`).
   *
   * Дубль `hooks/standards.js` W01 и `commit-gate.js` здесь осознанный: хуки живут
   * на машине агента, а этот сторож — в CI, куда хуки не доезжают.
   */
  it('ни один шаг не ослаблен', () => {
    expect(workflow).not.toMatch(/continue-on-error/);
    expect(workflow).not.toMatch(/\|\|\s*true\b/);
    expect(workflow).not.toMatch(/if:\s*false\b/);
  });
});
