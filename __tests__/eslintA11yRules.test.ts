// @vitest-environment node
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 LEGACY-016, пункт a11y. `plugin:jsx-a11y/recommended` был подключён, но пять правил
 * стояли уровнем `warn`, а `yarn lint` идёт без `--max-warnings` — 39 живых нарушений
 * не меняли кода возврата. Правило, которого не видно в коде возврата, не стережёт ничего.
 *
 * Долг разобран заходом 09.09.2026, уровень поднят до `error` без списка исключений
 * (решение арбитра, `books-app-docs/ai-context/decisions-log.md`). Сторож нужен потому,
 * что откат этой правки бесшумен: понижение строки в `.eslintrc.json` не краснит ничего,
 * а `yarn lint` остаётся зелёным. Проверяются два свойства:
 *
 * 1. нарушение каждого из пяти правил приходит **ошибкой** (severity 2), а не жёлтой строкой;
 * 2. ни один файл дерева не понижает эти правила своим `overrides` — иначе список
 *    исключений вернётся через заднюю дверь.
 */

const REPO_ROOT = resolve(__dirname, '..');

interface LintMessage {
  ruleId: string | null;
  severity: number;
}

interface LintResult {
  messages: LintMessage[];
}

interface EslintApi {
  calculateConfigForFile(file: string): Promise<{ rules?: Record<string, unknown[]> }>;
  lintText(text: string, options: { filePath: string }): Promise<LintResult[]>;
}

/**
 * ⚠️ `require`, а не `import`: пакета `@types/eslint` в зависимостях нет, ставить его ради
 * теста нельзя. Тот же приём и по той же причине — в `__tests__/eslintInlineStyles.test.ts`.
 */
const eslint: EslintApi = new (createRequire(resolve(REPO_ROOT, 'package.json'))('eslint').ESLint)({
  cwd: REPO_ROOT,
});

/**
 * Проба на каждое правило — минимальная разметка, которая его нарушает. Проверяется
 * текстом, а не временным файлом: файл-проба внутри репозитория остаётся мусором при
 * обрыве прогона. Путь при этом обязан быть существующим — конфигурация типозависима
 * (`parserOptions.project`), и на пути вне программы TypeScript разбор падает до того,
 * как правило успеет сработать.
 */
const PROBES: Array<{ rule: string; code: string }> = [
  {
    rule: 'jsx-a11y/no-autofocus',
    code: 'export const Probe = () => <input autoFocus />;',
  },
  {
    rule: 'jsx-a11y/click-events-have-key-events',
    code: 'export const Probe = () => <div onClick={() => {}} role="button" tabIndex={0} />;',
  },
  {
    rule: 'jsx-a11y/no-static-element-interactions',
    code: 'export const Probe = () => <div onClick={() => {}} onKeyDown={() => {}} />;',
  },
  {
    rule: 'jsx-a11y/label-has-associated-control',
    code: 'export const Probe = () => <label className="x">Имя</label>;',
  },
  {
    rule: 'jsx-a11y/img-redundant-alt',
    code: 'export const Probe = () => <img src="/a.png" alt="Photo of a book" />;',
  },
];

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

const sourceTsxFiles = (dir: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(resolve(REPO_ROOT, dir), { withFileTypes: true })) {
    const relative = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...sourceTsxFiles(relative));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(relative);
    }
  }

  return files;
};

/**
 * ⚠️ Дерево обходится целиком, а не по списку каталогов продукта: понижение правила
 * для файла из `api/`, `types/` или `__tests__/` не увидел бы ни один случай сторожа,
 * а `yarn lint` остался бы зелёным.
 */
const allTsxFiles = (): string[] =>
  readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NOT_SOURCE.has(entry.name))
    .flatMap((entry) => sourceTsxFiles(entry.name));

/**
 * Конфигурация у файла **одна на все пять правил**, поэтому она читается по разу на файл,
 * а не по разу на пару «файл × правило»: пятикратный обход дерева — это тот же класс
 * отказа по времени, что уже записан `LEGACY-297`.
 */
const severitiesFor = async (file: string): Promise<Record<string, string>> => {
  const config = await eslint.calculateConfigForFile(resolve(REPO_ROOT, file));
  const level = (rule: string): string => {
    const value = config.rules?.[rule]?.[0];
    if (value === 2 || value === 'error') return 'error';
    if (value === 1 || value === 'warn') return 'warn';
    return 'off';
  };

  return Object.fromEntries(PROBES.map((probe) => [probe.rule, level(probe.rule)]));
};

describe('правила a11y стерегут код возврата, а не только вывод (LEGACY-016)', () => {
  it.each(PROBES)(
    'нарушение $rule приходит ошибкой, а не предупреждением',
    async ({ rule, code }) => {
      const probePath = allTsxFiles()[0];
      expect(probePath, 'в дереве не нашлось ни одного .tsx для пробы').toBeDefined();

      const [result] = await eslint.lintText(code, {
        filePath: resolve(REPO_ROOT, probePath),
      });
      const messages = result.messages.filter((message) => message.ruleId === rule);

      expect(messages.length, `правило ${rule} не сработало на своей пробе`).toBeGreaterThan(0);
      // severity 2 — ошибка. При `warn` прогон остаётся зелёным: `yarn lint` идёт без
      // `--max-warnings`, и это намеренно — живые предупреждения дерева разбираются
      // своей записью (LEGACY-050), числом они здесь не называются (LEGACY-167).
      expect(messages[0]?.severity, `${rule} понижено до предупреждения`).toBe(2);
    },
    120_000
  );

  it('ни один файл дерева не понижает эти правила своим overrides', async () => {
    const files = allTsxFiles();

    // 🔴 Нижняя граница обязательна: без неё проверка зеленеет на пустом множестве.
    // Сузившийся обход — новое имя в `NOT_SOURCE`, переезд каталога — оставил бы случай
    // зелёным на подмножестве дерева, а понижение правила в необойдённом каталоге прошло
    // бы молча. Тот же приём и по той же причине — в `__tests__/eslintInlineStyles.test.ts`.
    expect(files.length).toBeGreaterThan(300);

    const lowered: string[] = [];

    for (const file of files) {
      const severities = await severitiesFor(file);
      for (const [rule, severity] of Object.entries(severities)) {
        if (severity !== 'error') lowered.push(`${rule} → ${file}`);
      }
    }

    expect(lowered).toEqual([]);
  }, 300_000);
});
