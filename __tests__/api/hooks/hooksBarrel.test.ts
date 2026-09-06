import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as barrel from '@/api/hooks';

/**
 * LEGACY-144: api/hooks/index.ts перечисляет переэкспорты вручную и уже расходился
 * с содержимым каталога — импорт существующего хука из '@/api/hooks' не работал.
 *
 * Гвард проверяет два разных утверждения, и оба нужны:
 *   1) barrel переэкспортирует имя **именно из этого файла** — по исходнику index.ts;
 *   2) имя действительно есть в собранном объекте '@/api/hooks'.
 * Одной второй проверки мало: при столкновении имён двух файлов (`usePage` — живой
 * пример) объект барреля содержит имя, пришедшее от одного из них, и тест второго
 * файла зеленел бы, хотя его экспорт из барреля недостижим.
 */

const HOOKS_DIR = path.resolve(__dirname, '../../../api/hooks');
const BARREL_FILE = path.join(HOOKS_DIR, 'index.ts');

// Единственное сознательное расхождение имён: usePages.ts и usePublic.ts обе
// объявляют `usePage` под разным смыслом (админ-чтение по id и публичное чтение
// по языку+слагу), поэтому публичная версия видна из барреля как `usePublicPage`.
const BARREL_ALIASES: Record<string, string> = {
  'usePublic.ts:usePage': 'usePublicPage',
};

/** `export const|function|async function Name` на верхнем уровне файла хука. */
function getTopLevelExportNames(filePath: string): string[] {
  const source = fs.readFileSync(filePath, 'utf-8');
  const names: string[] = [];
  const re = /^export (?:const|(?:async )?function) ([A-Za-z_][A-Za-z0-9_]*)/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    names.push(match[1]);
  }
  return names;
}

type BarrelReExports = {
  /** файл → имена, переэкспортированные из него поимённо (ключ — исходное имя) */
  named: Map<string, Map<string, string>>;
  /** файлы, отданные целиком через `export * from './useX'` */
  wildcard: Set<string>;
};

/** Разбор самого index.ts: какое имя из какого файла он переэкспортирует. */
function parseBarrel(source: string): BarrelReExports {
  const named = new Map<string, Map<string, string>>();
  const wildcard = new Set<string>();

  const star = /export\s+\*\s+from\s+'\.\/([A-Za-z0-9_]+)'/g;
  let match: RegExpExecArray | null;
  while ((match = star.exec(source)) !== null) {
    wildcard.add(`${match[1]}.ts`);
  }

  const block = /export\s*\{([^}]*)\}\s*from\s*'\.\/([A-Za-z0-9_]+)'/g;
  while ((match = block.exec(source)) !== null) {
    const file = `${match[2]}.ts`;
    const entries = named.get(file) ?? new Map<string, string>();
    for (const raw of match[1].split(',')) {
      const spec = raw.trim();
      if (!spec) continue;
      const aliased = spec.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/);
      if (aliased) entries.set(aliased[1], aliased[2]);
      else entries.set(spec, spec);
    }
    named.set(file, entries);
  }

  return { named, wildcard };
}

const hookFiles = fs
  .readdirSync(HOOKS_DIR)
  .filter((name) => name !== 'index.ts' && /^use.*\.ts$/.test(name));

const reExports = parseBarrel(fs.readFileSync(BARREL_FILE, 'utf-8'));

describe('api/hooks barrel (LEGACY-144)', () => {
  it('finds hook files and re-export statements (sanity check for the test itself)', () => {
    expect(hookFiles.length).toBeGreaterThan(20);
    expect(reExports.named.size + reExports.wildcard.size).toBe(hookFiles.length);
  });

  for (const file of hookFiles) {
    const exportedNames = getTopLevelExportNames(path.join(HOOKS_DIR, file));

    it(`re-exports every top-level export of ${file} from '@/api/hooks'`, () => {
      expect(exportedNames.length).toBeGreaterThan(0);

      for (const name of exportedNames) {
        const expectedBarrelName = BARREL_ALIASES[`${file}:${name}`] ?? name;

        if (!reExports.wildcard.has(file)) {
          const fromThisFile = reExports.named.get(file);
          expect(fromThisFile?.get(name), `${file} → ${name} не переэкспортирован`).toBe(
            expectedBarrelName
          );
        }

        expect(barrel).toHaveProperty(expectedBarrelName);
      }
    });
  }
});
