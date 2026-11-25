// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож числа потоков vitest на коммите (`T194`).
 *
 * `yarn test` идёт с `--maxWorkers=4`, а `vitest related --run` в `lint-staged` шёл без него:
 * на машине с 20 ядрами vitest брал потоки по числу ядер, тесты админки голодали и падали
 * по порогу 15 с в pre-commit, хотя в `yarn test` и в CI были зелёными. Коммит отбивался
 * чужими тестами, и его проводили с `VITEST_MAX_WORKERS=4` в окружении — четыре раза подряд
 * (решение арбитра `F08 | F08-11d-3`). Число потоков в обоих местах должно совпадать:
 * иначе pre-commit проверяет набор в других условиях, чем гейт (`yarn test`) и конвейер
 * (`yarn ci` -> `test:coverage`). Прогоны vitest в lint-staged ищутся и в форме `npx vitest`,
 * `yarn vitest`, `node_modules/.bin/vitest`.
 */
const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
  'lint-staged': Record<string, string[]>;
};

const workersOf = (command: string): string[] =>
  [...command.matchAll(/--maxWorkers[= ](\S+)/g)].map((m) => m[1]);

describe('vitest на коммите идёт с тем же числом потоков, что yarn test', () => {
  const vitestCommands = Object.values(pkg['lint-staged'])
    .flat()
    .filter((command) => /(^|[\s/])vitest(\s|$)/.test(command));

  it('в lint-staged есть прогон vitest', () => {
    expect(vitestCommands.length).toBeGreaterThan(0);
  });

  it('у yarn test число потоков задано ровно один раз', () => {
    expect(workersOf(pkg.scripts.test)).toHaveLength(1);
  });

  it('yarn test:coverage (его гоняют yarn ci и конвейер) идёт с тем же --maxWorkers', () => {
    expect(workersOf(pkg.scripts['test:coverage'])).toEqual(workersOf(pkg.scripts.test));
  });

  it('каждый прогон vitest в lint-staged разовый (--run): без него vitest повиснет в режиме наблюдения', () => {
    for (const command of vitestCommands) {
      expect(command.split(/\s+/), command).toContain('--run');
    }
  });

  it('каждый прогон vitest в lint-staged несёт то же --maxWorkers, что yarn test', () => {
    const [expected] = workersOf(pkg.scripts.test);
    for (const command of vitestCommands) {
      expect(workersOf(command), command).toEqual([expected]);
    }
  });
});
