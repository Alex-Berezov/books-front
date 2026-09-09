// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `.dockerignore` вырезает каталог `scripts` целиком и возвращает обратно поимённо.
 * Список возврата - рукописное зеркало того, что на самом деле импортируется во время
 * `yarn build`, и он уже дважды отставал от кода: пачка `Q3` завела
 * `scripts/lib/bundle-budget.mjs`, пачка `Q4` - `scripts/lib/snapshot-update.mjs`,
 * и оба раза отставание не видел никто из проверок.
 *
 * Отказ устроен подло: недостающий файл не ломает контекст сборки, он просто
 * отсутствует, и `RUN yarn build` умирает с ERR_MODULE_NOT_FOUND **только внутри
 * образа** - там, где ни `yarn ci`, ни `ci.yml` его не увидят. Красным становится
 * `Deploy Frontend`, то есть выкат, уже после зелёного CI.
 *
 * Поэтому здесь не список, а правило: граф импортов обходится от точек входа,
 * которые зовёт `yarn build`, и каждый достижимый локальный модуль обязан быть
 * возвращён в контекст.
 */

const REPO_ROOT = resolve(__dirname, '../..');

/** Точки входа берутся из package.json, а не выписываются рядом вторым списком. */
function buildEntryPoints(): string[] {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  const commands = [pkg.scripts.prebuild ?? '', pkg.scripts.build ?? ''].join(' && ');
  return [...commands.matchAll(/node\s+(scripts\/[\w./-]+\.mjs)/g)].map((m) => m[1]);
}

/** Локальные импорты одного модуля, разрешённые в пути от корня репозитория. */
function localImports(file: string): string[] {
  const src = readFileSync(join(REPO_ROOT, file), 'utf8');
  const specifiers = [...src.matchAll(/(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+'([^']+)'/g)].map(
    (m) => m[1]
  );
  return specifiers
    .filter((spec) => spec.startsWith('.'))
    .map((spec) =>
      relative(REPO_ROOT, resolve(dirname(join(REPO_ROOT, file)), spec)).replace(/\\/g, '/')
    );
}

/** Всё, что понадобится внутри образа при `yarn build`. */
function reachableModules(): string[] {
  const seen = new Set<string>();
  const queue = buildEntryPoints();
  while (queue.length) {
    const file = queue.shift() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const next of localImports(file)) if (!seen.has(next)) queue.push(next);
  }
  return [...seen];
}

/** Пути, возвращённые в контекст строками `!scripts/...`. */
function reincluded(): string[] {
  return readFileSync(join(REPO_ROOT, '.dockerignore'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('!scripts/'))
    .map((line) => line.slice(1));
}

describe('.dockerignore возвращает в образ всё, что нужно `yarn build`', () => {
  it('точки входа найдены в package.json, а не выдуманы', () => {
    const entries = buildEntryPoints();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) expect(existsSync(join(REPO_ROOT, entry))).toBe(true);
  });

  it('каждый достижимый модуль возвращён в контекст сборки', () => {
    const returned = reincluded();
    const missing = reachableModules().filter((file) => !returned.includes(file));

    // Сообщение важнее самого падения: без него следующий автор увидит только
    // ERR_MODULE_NOT_FOUND из образа и пойдёт искать причину в Dockerfile.
    expect(
      missing,
      `не возвращены в контекст образа: ${missing.join(', ')} — добавь по строке \`!<путь>\` в .dockerignore`
    ).toEqual([]);
  });

  it('обход графа не выродился: сторож видит и модули из scripts/lib', () => {
    // Без этого случая правило зеленело бы и на пустом графе - например если
    // регулярка импортов перестанет что-то находить.
    const reachable = reachableModules();
    expect(reachable).toContain('scripts/bundle-budget.mjs');
    expect(reachable.some((file) => file.startsWith('scripts/lib/'))).toBe(true);
  });

  it('данные, которые скрипты читают в образе, тоже возвращены', () => {
    // Снимок бюджета не импортируется, а читается с диска, поэтому графом импортов
    // не ловится - его присутствие закрепляется отдельно.
    expect(reincluded()).toContain('scripts/bundle-baseline.json');
  });
});
