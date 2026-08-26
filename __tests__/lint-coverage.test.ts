import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 LEGACY-151. `yarn lint` был `next lint`, а тот обходит только каталоги из
 * `eslint.dirs` в `next.config.js`. Список состоял из четырёх записей, одна из которых
 * (`src`) в репозитории не существует, а четыре существующих каталога с рабочим кодом
 * — `api/` (62 файла), `types/` (28), `providers/`, `scripts/` — и корневой
 * `middleware.ts` не проверялись вовсе. Линтерный статус у них был нулевой при зелёном
 * `yarn ci` и зелёном выкате; в `scripts/seed-content.ts` так прожил непойманным
 * настоящий отказ по правилу `@typescript-eslint/return-await`.
 *
 * Проверяется не текст конфигурации, а поведение линта: спрашиваем сам ESLint,
 * игнорирует ли он файл. Сверка списков строкой оставалась бы зелёной при возврате
 * охвата через `ignorePatterns` или через смену команды в `package.json`.
 */

const REPO_ROOT = resolve(__dirname, '..');

/**
 * Каталоги, которых линт не касается осознанно: артефакты и чужие копии кода.
 *
 * ⚠️ `styles` сюда не входит: там лежит не только SCSS, но и `styles/tokens.ts` —
 * TS-зеркало токенов, и линт его проверяет. Ошибочная запись в этом списке опаснее
 * пропуска: она делает сторож слепым ровно к тому каталогу, который в него внесли.
 */
const NOT_SOURCE = new Set([
  'node_modules',
  '.next',
  '.claude',
  '.yarn-cache',
  '.git',
  '.github',
  '.husky',
  '.vscode',
  'coverage',
  'playwright-report',
  'test-results',
  'public',
]);

/**
 * Каталоги исходников продукта — ровно то, что линтует сама сборка через
 * `eslint.dirs` в `next.config.js`. Тесты, спеки и скрипты сюда не входят
 * намеренно: их проверяет `yarn lint` по всему дереву, а сборке они не нужны.
 */
const PRODUCT_DIRS = ['api', 'app', 'components', 'lib', 'providers', 'types'];

function rootDirectoriesWithCode(): string[] {
  return readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NOT_SOURCE.has(entry.name))
    .map((entry) => entry.name)
    .filter((name) => firstSourceFile(resolve(REPO_ROOT, name)) !== null);
}

function firstSourceFile(directory: string): string | null {
  return allSourceFiles(directory)[0] ?? null;
}

function allSourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...allSourceFiles(full));
      continue;
    }
    if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) found.push(full);
  }
  return found;
}

interface LintResult {
  errorCount: number;
  messages: Array<{ ruleId: string | null }>;
}

interface EslintApi {
  isPathIgnored(file: string): Promise<boolean>;
  calculateConfigForFile(file: string): Promise<{ rules: Record<string, unknown> }>;
  lintText(
    text: string,
    options: { filePath: string; warnIgnored?: boolean }
  ): Promise<LintResult[]>;
}

/**
 * ⚠️ `require`, а не `import`: пакета `@types/eslint` в зависимостях нет, а ставить его
 * ради одного теста нельзя (`CLAUDE.md`, запрет 4). Нужны три метода, они и описаны выше;
 * подмена их формы уронит тест на типах, а не молча.
 */
const eslint: EslintApi = new (createRequire(resolve(REPO_ROOT, 'package.json'))('eslint').ESLint)({
  cwd: REPO_ROOT,
});

describe('охват линта (LEGACY-151)', () => {
  /**
   * 🔴 Проверяется **каждый** файл дерева, а не образец из каталога. Первая версия
   * этого сторожа брала первый попавшийся файл каталога `components` — `readdirSync`
   * отдавал `admin` раньше `public`, — и осталась зелёной, когда шаблон `public/`
   * в `ignorePatterns` (без ведущей косой, то есть совпадающий на любой глубине)
   * выключил из линта весь `components/public`: 31 компонент и 17 тестов. Образец
   * доказывает только про себя.
   */
  it('ни один файл исходников не выпал из охвата', async () => {
    const files = rootDirectoriesWithCode().flatMap((directory) =>
      allSourceFiles(resolve(REPO_ROOT, directory))
    );

    expect(files.length).toBeGreaterThan(500);

    const ignored: string[] = [];
    for (const file of files) {
      if (await eslint.isPathIgnored(file)) ignored.push(file);
    }

    expect(ignored).toEqual([]);
  });

  it.each(rootDirectoriesWithCode())('каталог %s линт проверяет', async (directory) => {
    const file = firstSourceFile(resolve(REPO_ROOT, directory)) as string;

    expect(await eslint.isPathIgnored(file)).toBe(false);
  });

  /**
   * `middleware.ts` лежит в корне и ни в какой каталог не входит: `next lint` его
   * не подхватывал в принципе. Это единственный файл гейта админки — из охвата
   * он выпадать не должен.
   */
  it.each(['middleware.ts', 'setupTests.ts', 'next.config.js'])(
    'корневой файл %s линт проверяет',
    async (file) => {
      expect(await eslint.isPathIgnored(resolve(REPO_ROOT, file))).toBe(false);
    }
  );

  it('команда lint зовёт eslint по всему дереву, а не по списку каталогов', () => {
    const scripts = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')).scripts;

    expect(scripts.lint).toContain('eslint .');
    expect(scripts.lint).not.toContain('next lint');
  });

  /**
   * `eslint.dirs` продолжает жить: по нему линтует сама сборка (`next build`).
   * Несуществующая запись там — не опечатка, а тихо потерянный охват, ровно как
   * было с `src`. Сверка идёт **в обе стороны**. Проверка «каждая запись существует на диске» ловит
   * только половину исходного дефекта: в списке был несуществующий `src` — и вместе
   * с ним четыре реальных каталога, которых там не было. Вычеркни кто-нибудь `api` —
   * односторонний тест остался бы зелёным, а сборка перестала бы линтовать слой запросов.
   */
  it('eslint.dirs совпадает с каталогами исходников продукта по составу', async () => {
    const config = (await import('../next.config.js')).default;
    const dirs = config.eslint.dirs as string[];

    expect([...dirs].sort()).toEqual([...PRODUCT_DIRS].sort());

    for (const directory of dirs) {
      expect(rootDirectoriesWithCode()).toContain(directory);
    }
  });
});

/**
 * 🔴 LEGACY-152. `AGENTS.md` и `CODE_STYLE.md` называют порядок импортов обязательным
 * и требуют «0 import/order warnings/errors», а в конфигурации правило стояло уровнем
 * `warn`. `next lint` при предупреждениях выходит нулём, поэтому требование не исполняла
 * ни одна проверка: `yarn lint`, `yarn ci` и выкат оставались зелёными при любом порядке
 * импортов и при любом смешении `import` и `import type`.
 *
 * Уровень спрашивается у самого ESLint (`calculateConfigForFile`), а не читается
 * из `.eslintrc.json`: правило может быть переопределено в `extends` или в `overrides`,
 * и разбор текста конфигурации этого не увидит.
 */
describe('строгость правил импорта (LEGACY-152)', () => {
  const severityOf = async (rule: string): Promise<number> => {
    const config = await eslint.calculateConfigForFile(resolve(REPO_ROOT, 'middleware.ts'));
    const entry = (config.rules as Record<string, unknown>)[rule];
    const level = Array.isArray(entry) ? entry[0] : entry;
    return level === 'error' ? 2 : level === 'warn' ? 1 : Number(level ?? 0);
  };

  it.each(['import/order', '@typescript-eslint/consistent-type-imports'])(
    'правило %s останавливает прогон, а не печатает предупреждение',
    async (rule) => {
      expect(await severityOf(rule)).toBe(2);
    }
  );

  /**
   * ⚠️ Образец нарочно берёт путь `.mjs`, а не `.ts`, и это не мелочь. Override
   * с `parserOptions.project` в `.eslintrc.json` действует на все `.ts` и `.tsx`:
   * разбор такого образца поднимает всю программу TypeScript — семь секунд внутри
   * общего `yarn test`. Под этой нагрузкой соседний тест
   * (`__tests__/app/retiredSlugRedirects.test.tsx`) вываливался за свои сорок секунд —
   * тот же класс, что описан в `vitest.config.ts:11-16`. На `.mjs` override не действует,
   * а `import/order` — правило не типозависимое и работает одинаково.
   *
   * Путь при этом существующий: файла, которого нет на диске, ESLint не разберёт вовсе
   * и вернёт ошибку парсера — прогон покраснеет, но не по той причине, ради которой
   * проверка написана. Поэтому `ruleId: null` в ожиданиях запрещён явно.
   */
  it('неверный порядок импортов роняет прогон линта', async () => {
    const [result] = await eslint.lintText(
      "import { resolve } from 'node:path';\nimport { ESLint } from 'eslint';\n\nexport const probe = () => resolve(String(ESLint.name));\n",
      { filePath: resolve(REPO_ROOT, 'scripts/check-env.mjs'), warnIgnored: false }
    );

    const rules = result.messages.map((message) => message.ruleId);

    expect(rules).not.toContain(null);
    expect(rules).toContain('import/order');
    expect(result.errorCount).toBeGreaterThan(0);
  });
});

/**
 * 🔴 LEGACY-155. `yarn validate` звал `yarn lint --fix` и `yarn typecheck`, а код возврата
 * брал только у второго: падение линта печаталось в вывод и терялось, в конце файла стоял
 * безусловный `exit 0`. Тесты скрипт не запускал вовсе. Команда с названием «validate»
 * возвращала успех практически всегда, и рапорт «yarn validate прошёл» не значил ничего.
 *
 * Скрипт удалён, а не починен: после починки он остался бы неполным подмножеством
 * `yarn ci` (без гвардов окружения, без языков, без занятых слагов и без покрытия),
 * то есть второй командой проверки с другим составом — ровно тот класс расхождения,
 * из-за которого заведены LEGACY-078, LEGACY-207 и LEGACY-209.
 */
describe('единственная точка входа проверок (LEGACY-155)', () => {
  const packageJson = (): { scripts: Record<string, string> } =>
    JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'));

  it('команды validate в package.json нет', () => {
    expect(Object.keys(packageJson().scripts)).not.toContain('validate');
  });

  it('скрипта validate-work.sh на диске нет', () => {
    expect(existsSync(resolve(REPO_ROOT, 'scripts/validate-work.sh'))).toBe(false);
  });

  /**
   * Состав `yarn ci` проверяется по существу, а не по строке целиком: порядок шагов
   * менять можно, а вот потерять шаг — нет. Так уже уезжали релизы мимо проверки.
   */
  it.each([
    'check:env',
    'check:langs',
    'check:reserved-slugs',
    'lint',
    'typecheck',
    'test:coverage',
  ])('yarn ci по-прежнему включает %s', (step) => {
    expect(packageJson().scripts.ci).toContain(step);
  });
});
