// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * 🔴 LEGACY-156. Обе кросс-репозиторные сверки — языки и зарезервированные слаги —
 * выполняются, только когда рядом лежит каталог `../books`. В конвейерах фронта
 * выкачивается один репозиторий, значит сверка не выполняется никогда, а шаг
 * остаётся зелёным. Проверка, умеющая отключаться по условию среды, обязана
 * говорить об этом в вывод: иначе зелёный лог читается как выполненная сверка.
 *
 * Песочница синтетическая и намеренно мелкая: проверяется поведение скрипта,
 * а не содержимое настоящих списков — их стерегут сами скрипты в `yarn ci`.
 */

const REPO_ROOT = resolve(__dirname, '../..');

let sandbox: string;
let front: string;

const run = (script: string, cwd: string) =>
  execFileSync(process.execPath, [join(cwd, 'scripts', script)], {
    cwd,
    encoding: 'utf8',
  });

/** Прогон, от которого ждут отказа: возвращает код возврата и весь вывод. */
const runFailing = (script: string, cwd: string): { status: number; output: string } => {
  try {
    run(script, cwd);
  } catch (error) {
    const failure = error as { status: number; stdout: string; stderr: string };
    return { status: failure.status, output: `${failure.stdout}${failure.stderr}` };
  }

  return { status: 0, output: '' };
};

const writeFrontFixture = (dir: string) => {
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'lib/i18n'), { recursive: true });
  mkdirSync(join(dir, 'lib/constants'), { recursive: true });
  mkdirSync(join(dir, 'app/[lang]/catalog'), { recursive: true });
  mkdirSync(join(dir, 'app/[lang]/[slug]'), { recursive: true });

  for (const script of ['check-langs-sync.mjs', 'check-reserved-slugs.mjs']) {
    cpSync(join(REPO_ROOT, 'scripts', script), join(dir, 'scripts', script));
  }

  // ⚠️ Настоящий `lang.ts` копируется, а не переписывается: список языков и так живёт
  // в двух местах (`lib/i18n/lang.ts` и `EXPECTED` внутри гварда), третья копия здесь
  // краснела бы на добавлении шестого языка сообщением про рассинхрон — то есть
  // не про то, ради чего этот тест написан.
  cpSync(join(REPO_ROOT, 'lib/i18n/lang.ts'), join(dir, 'lib/i18n/lang.ts'));
  writeFileSync(
    join(dir, 'lib/constants/reserved-slugs.ts'),
    "export const RESERVED_SLUGS = ['catalog'];\n"
  );
};

const writeBackendFixture = (dir: string, drift = false) => {
  mkdirSync(join(dir, 'prisma'), { recursive: true });
  mkdirSync(join(dir, 'src/shared/constants'), { recursive: true });

  writeFileSync(
    join(dir, 'prisma/schema.prisma'),
    drift
      ? 'enum Language {\n  en\n  es\n  fr\n  pt\n}\n'
      : 'enum Language {\n  en\n  es\n  fr\n  pt\n  ru\n}\n'
  );
  writeFileSync(
    join(dir, 'src/shared/constants/reserved-slugs.ts'),
    drift
      ? "export const RESERVED_SLUGS = ['about', 'catalog'];\n"
      : "export const RESERVED_SLUGS = ['catalog'];\n"
  );
};

beforeEach(() => {
  // Два уровня вложенности: скрипты ищут соседний репозиторий и на `../books`,
  // и на `../../books`. Оба кандидата обязаны отсутствовать, иначе «нет соседа»
  // не воспроизводится.
  sandbox = mkdtempSync(join(tmpdir(), 'bibliaris-guards-'));
  front = join(sandbox, 'nested', 'books-front');
  writeFrontFixture(front);
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('кросс-репозиторные гварды: пропуск виден в выводе (LEGACY-156)', () => {
  it.each(['check-langs-sync.mjs', 'check-reserved-slugs.mjs'])(
    '%s без соседнего репозитория печатает признак пропуска',
    (script) => {
      const output = run(script, front);

      expect(output).toContain('SKIPPED');
    }
  );

  it.each(['check-langs-sync.mjs', 'check-reserved-slugs.mjs'])(
    '%s без соседнего репозитория не объявляет сверку выполненной',
    (script) => {
      const output = run(script, front);
      const lastLine = output.trimEnd().split('\n').at(-1) ?? '';

      // Итоговая строка — единственное, что читают в зелёном логе. Пока сверки
      // не было, она не имеет права выглядеть как её успех.
      expect(lastLine.startsWith('✓')).toBe(false);
      expect(lastLine).toMatch(/SKIPPED|ONLY/);
    }
  );

  it.each(['check-langs-sync.mjs', 'check-reserved-slugs.mjs'])(
    '%s с соседним репозиторием сверку выполняет и о пропуске не пишет',
    (script) => {
      writeBackendFixture(join(sandbox, 'nested', 'books'));

      const output = run(script, front);

      expect(output).not.toContain('SKIPPED');
      expect(output.trimEnd().split('\n').at(-1) ?? '').toMatch(/^✓/);
    }
  );

  // ⚠️ Без этого случая доказано лишь то, что выбрана ветка с соседом. Удали кто-нибудь
  // само сравнение внутри неё — вывод остался бы прежним, и тест бы не покраснел.
  it.each(['check-langs-sync.mjs', 'check-reserved-slugs.mjs'])(
    '%s при расхождении списков падает, а не печатает успех',
    (script) => {
      writeBackendFixture(join(sandbox, 'nested', 'books'), true);

      const { status, output } = runFailing(script, front);

      expect(status).not.toBe(0);
      expect(output).toMatch(/mismatch|drifted|OUT OF SYNC/i);
    }
  );

  // Второй кандидат пути нужен рабочим копиям в `.claude/worktrees`: репозиторий там
  // лежит на уровень глубже. Выпади он из списка кандидатов — сверка снова не
  // выполнялась бы, и об этом никто бы не узнал.
  it.each(['check-langs-sync.mjs', 'check-reserved-slugs.mjs'])(
    '%s находит соседа и на два уровня выше',
    (script) => {
      writeBackendFixture(join(sandbox, 'books'));

      const output = run(script, front);

      expect(output).not.toContain('SKIPPED');
    }
  );
});

/**
 * Третий гвард того же класса - `check-type-sync.mjs` (пачка Q4). Он сверяет копию
 * схемы OpenAPI с оригиналом в соседнем `books`, то есть отключается по тому же
 * условию среды, что и два выше, и обязан так же говорить об этом вслух.
 *
 * Фикстура своя и синтетическая: гварду нужны каталог вызовов, копия схемы и снимок
 * поверхности, а не списки языков и слагов. Боевые каталоги сюда не копируются -
 * под полным прогоном это десятки секунд на случай.
 */
describe('check-type-sync.mjs: пропуск кросс-репо сверки виден в выводе (LEGACY-156)', () => {
  const SAMPLE = "export const list = () => httpGetAuth<Thing[]>('/thing');\n";
  const SCHEMA = JSON.stringify({
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
    },
    components: { schemas: { Thing: { properties: { id: { type: 'string' } } } } },
  });

  /** Песочница со снятым снимком; сосед создаётся только если он нужен случаю. */
  const buildFixture = (dir: string, withNeighbour: boolean) => {
    mkdirSync(join(dir, 'scripts/type-sync'), { recursive: true });
    mkdirSync(join(dir, 'api/endpoints'), { recursive: true });
    cpSync(join(REPO_ROOT, 'scripts/lib'), join(dir, 'scripts/lib'), { recursive: true });
    cpSync(
      join(REPO_ROOT, 'scripts/check-type-sync.mjs'),
      join(dir, 'scripts/check-type-sync.mjs')
    );
    writeFileSync(join(dir, 'api/endpoints/sample.ts'), SAMPLE);

    const neighbour = join(dir, '..', 'books', 'libs', 'api-client');
    mkdirSync(neighbour, { recursive: true });
    writeFileSync(join(neighbour, 'api-schema.json'), SCHEMA);

    execFileSync(process.execPath, [join(dir, 'scripts/check-type-sync.mjs'), '--update'], {
      cwd: dir,
      encoding: 'utf8',
    });

    if (!withNeighbour) rmSync(join(dir, '..', 'books'), { recursive: true, force: true });
  };

  const runGate = (dir: string) =>
    execFileSync(process.execPath, [join(dir, 'scripts/check-type-sync.mjs')], {
      cwd: dir,
      encoding: 'utf8',
    });

  it('без соседнего репозитория печатает признак пропуска', () => {
    const dir = join(sandbox, 'no-neighbour', 'books-front');
    buildFixture(dir, false);

    const output = runGate(dir);

    expect(output).toContain('SKIPPED');
    expect(output).toContain('did NOT run');
  });

  it('с соседним репозиторием о пропуске не пишет', () => {
    const dir = join(sandbox, 'with-neighbour', 'books-front');
    buildFixture(dir, true);

    expect(runGate(dir)).not.toContain('SKIPPED');
  });

  it('расхождение копии с соседом роняет прогон, а не печатает успех', () => {
    const dir = join(sandbox, 'drifted', 'books-front');
    buildFixture(dir, true);
    writeFileSync(
      join(dir, '..', 'books', 'libs', 'api-client', 'api-schema.json'),
      JSON.stringify({ openapi: '3.0.0', paths: { '/only-here': { get: {} } } })
    );

    let status = 0;
    let output = '';
    try {
      runGate(dir);
    } catch (error) {
      const failure = error as { status: number; stdout: string; stderr: string };
      status = failure.status;
      output = `${failure.stdout}${failure.stderr}`;
    }

    expect(status).not.toBe(0);
    expect(output).toContain('копия схемы разошлась');
  });
});
