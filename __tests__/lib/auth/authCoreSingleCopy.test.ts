// @vitest-environment node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

const deps = (pkg: Record<string, unknown>): Record<string, string> =>
  (pkg.dependencies as Record<string, string>) || {};

/**
 * 🔴 `lib/auth/config.ts` бросает наследника `CredentialsSignin` из `@auth/core/errors`,
 * и только его `code` доезжает до страницы входа. Работает это, пока копия `@auth/core`
 * в дереве **одна**: `@auth/core` тянет свои ошибки относительным путём, и при второй
 * копии наш класс перестанет быть наследником той, против которой библиотека делает
 * `instanceof`. Тогда наружу уйдёт `error=Configuration` без кода, и все причины отказа
 * входа схлопнутся в один общий текст — молча, при зелёных тестах (`LEGACY-053`).
 *
 * Отсюда два условия: зависимость объявлена явно и ровно тем номером, который пинит
 * `next-auth`, и вложенных копий в дереве нет.
 */
describe('@auth/core в дереве один', () => {
  it('объявлен явно и точным номером, а не диапазоном', () => {
    const declared = deps(readJson(join(root, 'package.json')))['@auth/core'];

    expect(declared).toBeTypeOf('string');
    expect(declared).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('номер совпадает с тем, который пинит next-auth', () => {
    const declared = deps(readJson(join(root, 'package.json')))['@auth/core'];
    const pinned = deps(readJson(join(root, 'node_modules/next-auth/package.json')))['@auth/core'];

    expect(declared).toBe(pinned);
  });

  it('вложенных копий в node_modules нет', () => {
    // ⚠️ Обход рекурсивный и учитывает скоупы. Проверка «на один уровень вниз»
    // мимо них проходит: у `@babel/...` и `@typescript-eslint/...` пакет лежит
    // на уровень глубже, а вложенность второго уровня в этом дереве уже есть
    // (`eslint-config-next/node_modules/ts-api-utils/node_modules/...`).
    // Такой сторож печатал бы «копий нет» при живой второй копии.
    const nested: string[] = [];

    const scanModules = (modulesDir: string, prefix: string) => {
      if (!existsSync(modulesDir)) return;

      for (const entry of readdirSync(modulesDir)) {
        if (entry === '.bin' || entry === '.cache') continue;

        const packages = entry.startsWith('@')
          ? readdirSync(join(modulesDir, entry)).map((name) => `${entry}/${name}`)
          : [entry];

        for (const pkg of packages) {
          const pkgDir = join(modulesDir, pkg);
          if (!statSync(pkgDir).isDirectory()) continue;

          const inner = join(pkgDir, 'node_modules');
          if (!existsSync(inner)) continue;

          const copy = join(inner, '@auth/core');
          if (existsSync(copy)) nested.push(`${prefix}${pkg}/node_modules/@auth/core`);

          scanModules(inner, `${prefix}${pkg}/node_modules/`);
        }
      }
    };

    scanModules(join(root, 'node_modules'), '');

    expect(nested).toEqual([]);
  });
});
