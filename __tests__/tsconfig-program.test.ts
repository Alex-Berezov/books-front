import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 LEGACY-150. Внутри репозитория лежат две копии чужого кода: `.claude/worktrees`
 * (рабочая копия агентской ветки, 92 файла `.ts`/`.tsx`) и `.yarn-cache` (24 851 файл
 * `.ts`). Запись утверждала, что `yarn typecheck` их разбирает и краснеет на коде,
 * которого в ветке нет. Замер 26.08.2026 показал обратное: `tsc --listFilesOnly` даёт
 * 0 файлов из обоих каталогов, потому что глоб `**` в `include` не спускается в
 * каталоги, имя которых начинается с точки. Ровно поэтому `.next/types/**` пришлось
 * перечислить в `include` отдельной строкой.
 *
 * Значит настоящий возврат дефекта — не удаление строки из `exclude`, а появление
 * в `include` пути с точкой в начале: одна такая строка затаскивает в программу
 * вторую копию проекта. Тест проверяет состав программы, а не текст конфигурации:
 * проверка на строку `exclude` осталась бы зелёной при таком возврате.
 *
 * `ts.parseJsonConfigFileContent` — та же логика отбора файлов, что у `tsc`, но без
 * запуска процесса и без разрешения модулей: в общем наборе `yarn test` это доли
 * секунды вместо десятков.
 */

const REPO_ROOT = resolve(__dirname, '..');
const FOREIGN_DIRECTORIES = ['.claude/worktrees', '.yarn-cache'];

function readTsconfig(): Record<string, unknown> {
  const source = readFileSync(resolve(REPO_ROOT, 'tsconfig.json'), 'utf8');
  const parsed = ts.parseConfigFileTextToJson('tsconfig.json', source);
  expect(parsed.error).toBeUndefined();
  return parsed.config as Record<string, unknown>;
}

function programFiles(config: Record<string, unknown>): string[] {
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, REPO_ROOT);
  return parsed.fileNames.map((file) => file.replace(/\\/g, '/'));
}

describe('состав программы typecheck (LEGACY-150)', () => {
  it('чужие копии в репозитории в программу не попадают', () => {
    const files = programFiles(readTsconfig());

    for (const directory of FOREIGN_DIRECTORIES) {
      expect(files.filter((file) => file.includes(`/${directory}/`))).toEqual([]);
    }
  });

  /**
   * Та самая мутация, ради которой тест и написан: `include` расширен путями
   * с точкой в начале — так, как это уже сделано для `.next/types`. Сегодня
   * от второй копии проекта в программе спасает только `exclude`; убери оттуда
   * строку — и этот случай покраснеет.
   */
  it('расширение include путём на точку всё равно не затаскивает чужие копии', () => {
    const config = readTsconfig();
    const include = config.include as string[];
    const files = programFiles({
      ...config,
      include: [...include, ...FOREIGN_DIRECTORIES.map((directory) => `${directory}/**/*.ts`)],
    });

    for (const directory of FOREIGN_DIRECTORIES) {
      expect(files.filter((file) => file.includes(`/${directory}/`))).toEqual([]);
    }
  });

  /**
   * Единственная проверка на текст конфигурации, и она здесь вынужденно.
   * `.next/types/**` — 66 файлов проверки маршрутов, которые Next генерирует
   * сборкой; в `yarn ci` тесты идут раньше сборки, поэтому на чистой машине
   * этих файлов на диске нет и составом программы их не проверить. Запись
   * LEGACY-150 рекомендовала дописать `.next` в `exclude` — исполнение этой
   * рекомендации выкинуло бы их из проверки типов, то есть ослабило бы её.
   */
  it('.next из проверки типов не исключён', () => {
    const config = readTsconfig();

    expect(config.include as string[]).toContain('.next/types/**/*.ts');
    expect(config.exclude as string[]).not.toContain('.next');
  });
});
