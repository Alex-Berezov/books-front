import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isOptimizableHost } from '@/lib/utils/image-host';

/**
 * 🔴 LEGACY-280. Негодное значение медиа-переменной отбрасывалось молча: `next.config.js`
 * ловит `new URL` веткой `catch` и возвращает `undefined`, запись в `images.remotePatterns`
 * не собирается вовсе, сборка зелёная. Человек, заведший переменную, уверен, что подключил
 * CDN; отказ вылезет только когда снимут статическую запись — и связать его с опечаткой
 * будет уже некому. Голый домен без схемы — самый вероятный ввод: именно так переменная
 * подписана в `.env.example`.
 *
 * Проверка стоит в `prebuild`, а не в `yarn ci`: у шага `Quality gates` в `ci.yml` нет
 * блока `env:`, а в сборке образа `yarn ci` не зовётся вовсе — там она не увидела бы
 * боевого значения никогда. Решение арбитра от 28.08.2026, `decisions-log.md`.
 *
 * Песочница нужна затем, что скрипт читает `.env`-файлы из `process.cwd()`: в корне
 * репозитория лежит `.env.local`, и прогон отсюда проверял бы машину разработчика.
 */

const REPO_ROOT = resolve(__dirname, '../..');

/** Годное окружение, на котором скрипт обязан молчать: медиа-переменные к нему добавляются. */
const BASE_ENV = {
  // `NODE_ENV` объявлен обязательным в типах Node и сужен до трёх значений:
  // без него и без `as const` не собирается сам вызов `spawnSync`.
  NODE_ENV: 'test' as const,
  NEXT_PUBLIC_SITE_URL: 'https://bibliaris.com',
  NEXT_PUBLIC_API_BASE_URL: 'https://api.bibliaris.com/api',
};

/** Хост, который заведомо стоит в `OPTIMIZABLE_HTTPS_HOSTS`: годный случай во всех проверках. */
const KNOWN_MEDIA_HOST = 'media.bibliaris.com';
const KNOWN_MEDIA_URL = `https://${KNOWN_MEDIA_HOST}`;

let sandbox: string;

/**
 * Оба потока, а не только stdout: отказы идут в `console.error`, а предупреждения —
 * в `console.warn`, и проверка «предупредил, но не уронил» по одному stdout была бы
 * зелёной независимо от того, напечатал скрипт хоть что-нибудь.
 */
const run = (env: Record<string, string>): { status: number; output: string } => {
  const result = spawnSync(process.execPath, [join(sandbox, 'scripts', 'check-site-url.mjs')], {
    cwd: sandbox,
    encoding: 'utf8',
    // Окружение задаётся целиком: унаследованное затянуло бы сюда переменные машины
    // прогона, и тест краснел бы по причине, к этой записи отношения не имеющей.
    env: { PATH: process.env.PATH ?? '', ...BASE_ENV, ...env },
  });

  return { status: result.status ?? -1, output: `${result.stdout}${result.stderr}` };
};

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'bibliaris-site-url-'));
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, 'lib', 'utils'), { recursive: true });
  cpSync(
    join(REPO_ROOT, 'scripts', 'check-site-url.mjs'),
    join(sandbox, 'scripts', 'check-site-url.mjs')
  );
  // Настоящий предикат копируется, а не переписывается: список хостов и так живёт
  // в двух местах, третья копия здесь краснела бы на добавлении хоста — то есть
  // не про то, ради чего этот тест написан.
  cpSync(
    join(REPO_ROOT, 'lib', 'utils', 'image-host.ts'),
    join(sandbox, 'lib', 'utils', 'image-host.ts')
  );
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('check-site-url.mjs: формат медиа-переменных', () => {
  it('пропускает прогон, когда ни одна медиа-переменная не задана', () => {
    // Незаданное значение — законное состояние: работает статическая запись
    // `media.bibliaris.com`, и локальные сборки живут без обеих переменных.
    const { status, output } = run({});

    expect(status).toBe(0);
    expect(output).toContain('NEXT_PUBLIC_SITE_URL');
  });

  it('пропускает прогон, когда медиа-переменная задана пустой строкой', () => {
    const { status } = run({ NEXT_PUBLIC_MEDIA_CDN_URL: '' });

    expect(status).toBe(0);
  });

  it('роняет прогон на значении из одних пробелов, а не зовёт его незаданным', () => {
    // `next.config.js:8` берёт значение как есть: строка из пробелов истинна, конфиг
    // её выбирает и молча отбрасывает. Строка «переменная не задана» описывала бы
    // не то состояние, в котором сборка оказалась.
    const { status, output } = run({ NEXT_PUBLIC_MEDIA_CDN_URL: '   ' });

    expect(status).not.toBe(0);
    expect(output).toContain('whitespace only');
  });

  it.each(['NEXT_PUBLIC_MEDIA_CDN_URL', 'NEXT_PUBLIC_UPLOADS_BASE_URL'])(
    'пропускает годное значение %s',
    (name) => {
      const { status } = run({ [name]: 'https://media.bibliaris.com' });

      expect(status).toBe(0);
    }
  );

  it('принимает http для локального адреса из .env.example', () => {
    // `.env.example:5` предлагает `http://localhost:8787`; отказ по схеме сломал бы
    // локальную сборку у каждого, кто взял образец как есть.
    const { status } = run({ NEXT_PUBLIC_UPLOADS_BASE_URL: 'http://localhost:8787' });

    expect(status).toBe(0);
  });

  it.each(['NEXT_PUBLIC_MEDIA_CDN_URL', 'NEXT_PUBLIC_UPLOADS_BASE_URL'])(
    'роняет прогон на голом домене без схемы в %s',
    (name) => {
      const { status, output } = run({ [name]: 'media.bibliaris.com' });

      expect(status).not.toBe(0);
      // Сообщение обязано назвать ИМЕННО ту переменную, откуда пришло значение:
      // иначе при красной сборке оператор идёт проверять обе.
      expect(output).toContain(name);
      expect(output).toContain('media.bibliaris.com');
    }
  );

  it('роняет прогон на значении с пробелом', () => {
    const { status, output } = run({ NEXT_PUBLIC_MEDIA_CDN_URL: 'https:// media.bibliaris.com' });

    expect(status).not.toBe(0);
    expect(output).toContain('NEXT_PUBLIC_MEDIA_CDN_URL');
  });

  it('роняет прогон на схеме, которую оптимизатор не примет', () => {
    const { status, output } = run({ NEXT_PUBLIC_MEDIA_CDN_URL: 'ftp://media.bibliaris.com' });

    expect(status).not.toBe(0);
    expect(output).toContain('http(s)');
  });

  it('не трогает прежнюю проверку адреса сайта', () => {
    // Встречная: файл теперь сторожит две темы, и вторая не должна была съесть первую.
    const { status, output } = run({ NEXT_PUBLIC_SITE_URL: 'https://api.bibliaris.com' });

    expect(status).not.toBe(0);
    expect(output).toContain('service host');
  });
});

/**
 * 🔴 Третий источник хостов `images.remotePatterns` — значение самой медиа-переменной
 * (`next.config.js:75`). Оптимизатор его принимает, `isOptimizableHost` о нём не знает,
 * и все картинки сайта уходят оригиналами без единого сигнала: сверка списков
 * в `next.config.test.ts` идёт при снятых переменных, то есть этой стороны не видит
 * по построению. Решение арбитра от 28.08.2026: отказ здесь, а не чтение переменной
 * предикатом — иначе бандл и конфиг разойдутся при `next start` (LEGACY-291).
 */
describe('check-site-url.mjs: хост медиа-переменной известен предикату', () => {
  it('роняет прогон на хосте, которого нет в OPTIMIZABLE_HTTPS_HOSTS', () => {
    const { status, output } = run({ NEXT_PUBLIC_MEDIA_CDN_URL: 'https://cdn.example.org' });

    expect(status).not.toBe(0);
    expect(output).toContain('cdn.example.org');
    expect(output).toContain('lib/utils/image-host.ts');
  });

  it('роняет прогон на известном хосте по http — предикат решает по паре схема+хост', () => {
    // 🔴 Половина правила пропустила бы самую вероятную опечатку: `.env.example:5`
    // предлагает для соседней переменной `http://`. Хост в списке есть, но
    // `isOptimizableHost('http://media.bibliaris.com/a.jpg')` даёт `false`, и весь сайт
    // ушёл бы оригиналами при зелёной сборке.
    const { status, output } = run({ NEXT_PUBLIC_MEDIA_CDN_URL: `http://${KNOWN_MEDIA_HOST}` });

    expect(status).not.toBe(0);
    expect(output).toContain('https only');
  });

  it('не роняет сборку на пробельном значении затенённой переменной', () => {
    // Файл сам объявляет правило: не ронять из-за значения, которого конфиг не читает.
    // Пробельная затенённая переменная — тот же случай, и отказ здесь врал бы текстом
    // «конфиг берёт её как значение»: конфиг берёт первую непустую, и она исправна.
    const { status, output } = run({
      NEXT_PUBLIC_MEDIA_CDN_URL: KNOWN_MEDIA_URL,
      NEXT_PUBLIC_UPLOADS_BASE_URL: '   ',
    });

    expect(status).toBe(0);
    expect(output).toContain('does not read it while NEXT_PUBLIC_MEDIA_CDN_URL is set');
  });

  it.each([
    'http://127.0.0.1:8787',
    'http://minio:9000',
    'http://192.168.1.50:9000',
    'http://10.0.0.5:9000',
    'http://host.docker.internal:9000',
    'http://media.localhost:9000',
  ])('не роняет сборку на разработческом адресе %s, а предупреждает', (value) => {
    // Выхода у разработчика иначе не остаётся: такой хост нельзя дописать в список
    // предиката — от этого краснеет сверка множеств в `next.config.test.ts:208`.
    const { status, output } = run({ NEXT_PUBLIC_UPLOADS_BASE_URL: value });

    expect(status).toBe(0);
    expect(output).toContain('local http address');
  });

  it('роняет прогон на подстановке в имени хоста, не советуя дописать её в предикат', () => {
    // `new URL` подстановку разбирает, `prebuild` идёт до загрузки `next.config.js`,
    // и совет «допиши хост» увёл бы прямо в LEGACY-137.
    const { status, output } = run({ NEXT_PUBLIC_MEDIA_CDN_URL: 'https://**.bibliaris.com' });

    expect(status).not.toBe(0);
    expect(output).toContain('LEGACY-137');
    expect(output).not.toContain('OPTIMIZABLE_HTTPS_HOSTS');
  });

  it('видит пробельное значение и в .env-файле, а не только в окружении', () => {
    // Next при своей загрузке `.env` кавычки сохраняет: `="   "` доезжает до конфига
    // непустой строкой, и он молча отбрасывает медиа-запись.
    writeFileSync(join(sandbox, '.env'), 'NEXT_PUBLIC_MEDIA_CDN_URL="   "\n');

    const { status, output } = run({});

    expect(status).not.toBe(0);
    expect(output).toContain('whitespace only');
  });

  it('пропускает http://localhost, хотя его в списке предиката нет', () => {
    // Локальная сборка по `.env.example` обязана проходить: `localhost` разбирается
    // предикатом отдельной веткой, а не через список хостов.
    const { status } = run({ NEXT_PUBLIC_UPLOADS_BASE_URL: 'http://localhost:8787' });

    expect(status).toBe(0);
  });

  it('не сверяет затенённую переменную — её конфиг не читает', () => {
    // `next.config.js:8` берёт первую непустую. Ронять сборку из-за значения,
    // которого конфиг не читает, значит останавливать её по несуществующей причине.
    const { status, output } = run({
      NEXT_PUBLIC_MEDIA_CDN_URL: KNOWN_MEDIA_URL,
      NEXT_PUBLIC_UPLOADS_BASE_URL: 'https://cdn.example.org',
    });

    expect(status).toBe(0);
    expect(output).toContain('shadowed by NEXT_PUBLIC_MEDIA_CDN_URL');
  });

  it('роняет прогон, когда список предиката нечитаем', () => {
    // Сторож, тихо пропускающий прогон при нечитаемом входе, — это тот самый дефект,
    // против которого он написан (L-015). Поэтому здесь отказ, а не пропуск.
    rmSync(join(sandbox, 'lib', 'utils', 'image-host.ts'));

    const { status, output } = run({ NEXT_PUBLIC_MEDIA_CDN_URL: KNOWN_MEDIA_URL });

    expect(status).not.toBe(0);
    expect(output).toContain('lib/utils/image-host.ts');
  });

  it('роняет прогон, когда список переименован и сверять стало нечем', () => {
    writeFileSync(
      join(sandbox, 'lib', 'utils', 'image-host.ts'),
      `export const HOSTS = ['${KNOWN_MEDIA_HOST}'];\n`
    );

    const { status, output } = run({ NEXT_PUBLIC_MEDIA_CDN_URL: KNOWN_MEDIA_URL });

    expect(status).not.toBe(0);
    expect(output).toContain('OPTIMIZABLE_HTTPS_HOSTS');
  });
});

/**
 * 🔴 `check-site-url.mjs` не зовёт предикат, а повторяет его правило руками: он `.mjs`,
 * предикат — TypeScript. Из файла читается только список хостов, связка «схема + хост»
 * скопирована. Значит сузят предикат — сторож этого не заметит и продолжит пропускать
 * значение, на котором картинки уже уходят оригиналами.
 *
 * Поэтому обе стороны сверяются здесь на одной таблице: вердикт сторожа обязан совпадать
 * с вердиктом предиката на каждом значении.
 */
describe('вердикт сторожа совпадает с вердиктом предиката', () => {
  it.each([
    `https://${KNOWN_MEDIA_HOST}`,
    'https://api.bibliaris.com',
    'https://cdn.example.org',
    `http://${KNOWN_MEDIA_HOST}`,
    'http://localhost:8787',
  ])('%s', (value) => {
    const acceptedByPredicate = isOptimizableHost(`${value}/a.jpg`);
    const acceptedByGuard = run({ NEXT_PUBLIC_MEDIA_CDN_URL: value }).status === 0;

    expect(acceptedByGuard).toBe(acceptedByPredicate);
  });
});

describe('check-site-url.mjs: прогон говорит, что проверил', () => {
  it('называет медиа-переменную и её значение, когда она задана', () => {
    const { output } = run({ NEXT_PUBLIC_MEDIA_CDN_URL: KNOWN_MEDIA_URL });

    expect(output).toContain(`NEXT_PUBLIC_MEDIA_CDN_URL = ${KNOWN_MEDIA_URL}`);
  });

  it('говорит вслух, что проверять было нечего, когда ни одна не задана', () => {
    // L-015: успешная строка про соседний предмет читается как «проверил и всё хорошо»,
    // хотя означает «проверять было нечего». Пустая репозиторная переменная
    // (`deploy.yml:72`) выглядела бы в логе выката ровно как исправная сборка.
    const { status, output } = run({});

    expect(status).toBe(0);
    expect(output).toContain('neither');
    expect(output).toContain('static media.bibliaris.com entry');
  });
});
