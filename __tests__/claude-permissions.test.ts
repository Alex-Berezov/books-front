import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож списка прав агента (`LEGACY-250`).
 *
 * 🔴 Зачем он существует. Коммит `da90136` («fix: remove docker run permission from
 * settings») удалил строку `Bash(docker run:*)` из блока **`deny`**, а не из `allow`, —
 * то есть сделал ровно обратное тому, что объявлено сообщением. Заметить это было нечем:
 * файл не читает ни линт, ни сборка, ни один тест, покрытие к нему не относится, а
 * сообщение коммита читается будущим ревьюером как ужесточение, поэтому строку не идут
 * искать. Дефект нашёлся случайно, спустя сутки, ревью соседнего диффа.
 *
 * Цена ошибки не в одной команде: `docker run` с монтированием тома читает любой файл
 * рабочей папки, включая `.env*`, а `--network host` даёт сеть хоста — то есть одной
 * снятой строкой обходятся соседние запреты на `psql`, продовые compose-файлы,
 * `docker exec` и чтение `.env`.
 *
 * Что проверяется: каждая строка обязательного списка лежит **ровно в `deny`** и ни одна
 * не попала в `allow`. Сверка точным равенством, а не вхождением подстроки: `docker run`
 * — подстрока `docker run:*` и наоборот (`qa-lessons` L-008).
 */

const ROOT = resolve(__dirname, '..');
const SETTINGS = join(ROOT, '.claude', 'settings.json');

interface Settings {
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
}

/**
 * Строки, снятие которых открывает доступ к живой машине. Список намеренно перечисляет
 * формы запуска, а не одну команду: `docker container run` — полный синоним `docker run`,
 * `docker create` + `docker start` даёт тот же контейнер в два шага, `docker cp` достаёт
 * файл из контейнера, не запуская ничего, а `docker-compose` — легаси-бинарь мимо
 * `docker compose`.
 *
 * ⚠️ Список — не граница безопасности и заявляться ею не должен: права сверяются с
 * командой верхнего уровня, поэтому любой `docker run` изнутри скрипта (`yarn ci` →
 * `scripts/ci.sh`) проходит мимо правил в принципе. Здесь он держит осознанное решение
 * от того, чтобы его сняли молча.
 */
const REQUIRED_DENY = [
  'Bash(docker run:*)',
  'Bash(docker container:*)',
  'Bash(docker create:*)',
  'Bash(docker start:*)',
  'Bash(docker cp:*)',
  'Bash(docker exec:*)',
  'Bash(docker-compose:*)',
  'Bash(docker compose --file:*)',
  'Bash(docker compose -f docker-compose.prod.yml:*)',
  'Bash(psql:*)',
  'Read(./.env)',
  'Read(./.env.*)',
] as const;

const settings = (): Settings => JSON.parse(readFileSync(SETTINGS, 'utf8')) as Settings;

describe('LEGACY-250: список запретов агента не редеет молча', () => {
  it('файл разбирается и содержит оба блока', () => {
    const permissions = settings().permissions;
    expect(Array.isArray(permissions?.deny)).toBe(true);
    expect(Array.isArray(permissions?.allow)).toBe(true);
  });

  it.each(REQUIRED_DENY.map((rule) => [rule] as const))('%s запрещён', (rule) => {
    // Сообщение печатает саму строку: по `false !== true` не понять, какая пропала.
    expect([rule, settings().permissions?.deny ?? []]).toEqual([
      rule,
      expect.arrayContaining([rule]),
    ]);
  });

  // 🔴 Обратная сторона той же ошибки: строку можно не удалить, а перенести в `allow`,
  // и дифф будет выглядеть перестановкой. `deny` сильнее `allow`, но полагаться на
  // порядок разрешения здесь незачем — в `allow` этих строк быть не должно вовсе.
  it.each(REQUIRED_DENY.map((rule) => [rule] as const))('%s не разрешён', (rule) => {
    expect([rule, settings().permissions?.allow ?? []]).toEqual([
      rule,
      expect.not.arrayContaining([rule]),
    ]);
  });
});
