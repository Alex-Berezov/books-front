// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * LEGACY-183, CODE_STYLE.md («Component file structure»): завёл барель — импортируй через него.
 * Имена `RightsClaim*` и `BookRightsDashboard*` достижимы через `@/types/api-schema`; второй путь к тем же типам — вторая
 * точка входа, которую автоимпорт IDE размножает. Контрибьютора (`BookVersionContributor`,
 * `ContributorRole`) сторож не ведёт: `types/contributors.ts` удалён (`T104b`), обход ловит `tsc`.
 *
 * Обходит всё дерево исходников, а не список каталогов: новый каталог не должен оставаться
 * слепым пятном. Ловит любые кавычки, относительный путь, `export … from`, `import()`
 * и `vi.mock()` — форма импорта сторожу безразлична, важен модуль.
 */

const REPO_ROOT = resolve(__dirname, '..');
const SKIP_DIRS = new Set([
  'node_modules',
  'coverage',
  'public',
  'playwright-report',
  'test-results',
]);
const SELF = 'apiSchemaBarrelImports.test.ts';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx?|mts|cts)$/.test(entry.name) && entry.name !== SELF ? [path] : [];
  });
}

// Любой спецификатор модуля, кончающийся на `types/api-schema/<модуль>` (с `@/`,
// относительный, в одинарных, двойных или обратных кавычках), кроме самого бареля.
// `book-rights` переведён на барель в `T104k`.
const GUARDED_SPECIFIERS = {
  'rights-claims': /(['"`])(?:@\/|(?:\.\.?\/)+)(?:types\/)?api-schema\/rights-claims\1/,
  'book-rights': /(['"`])(?:@\/|(?:\.\.?\/)+)(?:types\/)?api-schema\/book-rights\1/,
};

function findBypassingImports(source: string, file: string): string[] {
  // Сам барель и соседние модули `types/api-schema/*` ссылаются на свои соседи законно.
  if (/[\/]types[\/]api-schema[\/]/.test(file)) return [];
  return Object.entries(GUARDED_SPECIFIERS)
    .filter(([, specifier]) => specifier.test(source))
    .map(([name]) => `types/api-schema/${name}`);
}

describe('импорты RightsClaim* и BookRightsDashboard* идут через барель @/types/api-schema', () => {
  it.each([
    ["import type { A } from '@/types/api-schema/rights-claims';"],
    ['import type { A } from "@/types/api-schema/rights-claims";'],
    ["import type { A as B } from '../../types/api-schema/rights-claims';"],
    ["export type { A } from '@/types/api-schema/rights-claims';"],
    ["type A = import('@/types/api-schema/rights-claims').A;"],
    ["vi.mock('@/types/api-schema/rights-claims');"],
  ])('узнаёт обход: %s', (source) => {
    expect(findBypassingImports(source, 'components/x.ts')).toEqual([
      'types/api-schema/rights-claims',
    ]);
  });

  it.each([
    ["import type { A } from '@/types/api-schema/book-rights';"],
    ["import type { A } from '../types/api-schema/book-rights';"],
  ])('узнаёт обход book-rights: %s', (source) => {
    expect(findBypassingImports(source, 'components/x.ts')).toEqual([
      'types/api-schema/book-rights',
    ]);
  });

  it.each([
    ["import type { A } from '@/types/api-schema';"],
    ["import type { A } from '@/types/api-schema/rights-claims-extra';"],
    ["import type { A } from '@/types/api-schema/book-rights-extra';"],
  ])('пропускает барель и чужой модуль: %s', (source) => {
    expect(findBypassingImports(source, 'components/x.ts')).toEqual([]);
  });

  it('ни один файл не обходит барель', () => {
    const offenders = sourceFiles(REPO_ROOT).flatMap((file) => {
      const rel = file.slice(REPO_ROOT.length + 1);
      return findBypassingImports(readFileSync(file, 'utf8'), rel).map((what) => `${rel}: ${what}`);
    });
    expect(offenders).toEqual([]);
  });
});
