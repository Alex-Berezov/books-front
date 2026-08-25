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
 * 🔴 Список обязан совпадать с `deny` дословно и целиком. 25.08.2026 ревью нашло, что после
 * двух переписываний в нём осталось 17 строк из 23: не проверялись
 * `Read(//d/newDev/.env.prod.server)` — прямое чтение боевого env по абсолютному пути —
 * и пять форм `docker compose down|run|exec`. Тест при этом был зелёный и объявлял себя
 * проверкой «список запретов не редеет молча», не следя за четвертью списка. Сторож,
 * стерегущий часть, хуже отсутствующего: он создаёт уверенность, которой не обеспечивает.
 *
 * Добавил строку в `deny` — добавь её и сюда. Убрал — объясни в
 * `books-app-docs/ai-context/decisions-log.md`, почему убрал (урок L-022).
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
 * формы запуска, а не одну команду: `docker compose --file` — обход двух предыдущих строк
 * длинной формой ключа, а `docker-compose` — легаси-бинарь мимо `docker compose`.
 *
 * ⚠️ Список — не граница безопасности и заявляться ею не должен: права сверяются с
 * командой верхнего уровня, поэтому любой `docker run` изнутри скрипта (`yarn ci` →
 * `scripts/ci.sh`) проходит мимо правил в принципе. Здесь он держит осознанное решение
 * от того, чтобы его сняли молча.
 *
 * 🔴 Список пересобран 25.08.2026 при переходе на автономный режим (ТЗ
 * `tasks/2026-08-25-avtonomnyy-harness.md`, раздел 8). Из `deny` ушли только `psql`
 * и семейство `prisma`: их заменил `D:/newDev/.claude/hooks/db-guard.js`, который
 * различает локальную базу и боевую по строке подключения, чего `deny` по имени команды
 * не умеет. Всё остальное осталось и дополнено: `docker run` и соседние формы запуска
 * ревью вернуло обратно, потому что страж читает текст команды и внутрь контейнера
 * не заглядывает — `docker run -v .:/w alpine cat /w/.env` обходит и его, и `Read(./.env)`.
 * Дефисные формы `docker-compose -f` добавлены: без них боевые compose-файлы закрыты
 * только через пробел.
 *
 * ⚠️ Сторожа на сам факт «файл заменён хуком» здесь нет и быть не может: хуки лежат
 * в `D:/newDev/.claude`, это чужой репозиторий, и в CI его нет вовсе. Ссылка на него
 * из теста делает прогон красным на каждом пуше. Наличие, регистрацию и живое поведение
 * хуков проверяет `D:/newDev/.claude/hooks/obvyazka-selftest.js` — там, где они живут.
 */
const REQUIRED_DENY = [
  'Bash(docker-compose:*)',
  'Bash(docker start:*)',
  'Bash(docker create:*)',
  'Bash(docker container:*)',
  'Bash(docker cp:*)',
  'Bash(docker exec:*)',
  'Bash(docker run:*)',
  'Bash(docker compose -f docker-compose.prod.yml:*)',
  'Bash(docker compose -f docker-compose.monitoring.yml:*)',
  'Bash(docker compose --profile prod:*)',
  'Bash(docker compose --file:*)',
  'Read(./.env)',
  'Read(./.env.*)',
  'Read(//d/newDev/.env.prod.server)',
  'Bash(docker compose down:*)',
  'Bash(docker compose run:*)',
  'Bash(docker compose exec:*)',
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
