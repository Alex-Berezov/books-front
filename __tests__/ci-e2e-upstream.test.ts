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
