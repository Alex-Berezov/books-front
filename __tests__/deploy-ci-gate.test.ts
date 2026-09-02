import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож связи выката с прогоном CI (`LEGACY-283`).
 *
 * 🔴 До 02.09.2026 `ci.yml` и `deploy.yml` срабатывали на один и тот же push в `main`
 * двумя независимыми запусками, и связи между ними не было никакой. Job `test` внутри
 * выката гоняет `yarn ci`, а шага e2e в нём нет: набор playwright стоит только в `ci.yml`
 * и притом последним — после `yarn ci`, сборки и установки браузера. К моменту его вердикта
 * выкат был заведомо завершён, и в логе GitHub зелёный `Deploy Frontend` соседствовал
 * с красным `CI` по одному и тому же SHA.
 *
 * Проверять это чем-то, кроме сторожа по тексту, нечем: yaml конвейера не разбирает
 * ни `tsc`, ни `eslint`, ни vitest, а сам `deploy.yml` до 02.09.2026 не проверялся
 * вообще ничем — ни одной спекой в репозитории.
 *
 * ⚠️ Разбор текстовый: пакет `yaml` прямой зависимостью не объявлен, а добавлять её
 * запрещено п.4 `CLAUDE.md` без разрешения. Поэтому каждая проверка требует найденного
 * куска отдельным утверждением — сломается разбор, будет видно, что сломался разбор,
 * а не «всё в порядке».
 */
const DEPLOY_WORKFLOW = resolve(__dirname, '..', '.github', 'workflows', 'deploy.yml');
const workflow = readFileSync(DEPLOY_WORKFLOW, 'utf8');

/** Тело job по имени: от `  <имя>:` до следующего job того же отступа. */
const jobBody = (name: string): string | undefined => {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  if (start === -1) return undefined;

  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z_]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
};

describe('конвейер выката фронта: красный CI останавливает выкат', () => {
  it('job ci_gate заведён и разбирается', () => {
    const gate = jobBody('ci_gate');
    expect(gate, 'job ci_gate не найден — красный CI выкат не остановит').toBeDefined();
    expect(gate?.length).toBeGreaterThan(300);
  });

  /**
   * 🔴 Прогон ищется по ПУТИ файла, а не по имени workflow. Имя правится одной строкой
   * и молча разводит гейт с тем, что он сторожит: `select(.name == ...)` перестал бы
   * находить прогоны вовсе, а ветка «прогонов нет» — это ожидание, то есть гейт
   * доработал бы до таймаута и упал по неверной причине.
   */
  it('ci_gate ищет прогон по пути файла, а не по имени workflow', () => {
    const gate = jobBody('ci_gate');
    expect(gate).toMatch(/select\(\.path == "\.github\/workflows\/ci\.yml"\)/);
    expect(gate).not.toMatch(/select\(\.name ==/);
  });

  /**
   * Три исхода, а не два. Успех есть — выход 0; прогоны есть и все завершены без успеха —
   * отказ немедленно; дедлайн — тоже отказ. Свернись третий во второй, и гейт молча
   * пропускал бы коммит, у которого прогона не завелось вовсе.
   */
  it('ci_gate отказывает и на красном прогоне, и по дедлайну', () => {
    const gate = jobBody('ci_gate') ?? '';
    const failures = gate.match(/exit 1/g) ?? [];
    expect(failures.length).toBeGreaterThanOrEqual(2);
    expect(gate).toMatch(/conclusion == "success"/);
    expect(gate).toMatch(/status != "completed"/);
  });

  /**
   * Гейт, не стоящий в `needs` у выката, — это job, который краснеет рядом
   * с уехавшим на прод релизом. Ровно так и было устроено до 02.09.2026,
   * только красным был весь `ci.yml`.
   */
  it('выкат зависит от ci_gate и не идёт при его отказе', () => {
    const deploy = jobBody('deploy');
    expect(deploy, 'job deploy не найден').toBeDefined();
    expect(deploy).toMatch(/needs:\s*\[build, ci_gate\]/);
    expect(deploy).toMatch(/needs\.ci_gate\.result == 'success'/);
  });

  /**
   * ⚠️ `skipped` в условии — это ветка `workflow_dispatch`: ручной выкат делают
   * на коммите, чей `ci.yml` мог отгореть когда угодно, и требование свежего прогона
   * превратило бы ручной запуск в тупик. Но допускается ровно `skipped`, а не любой
   * исход: условие вида «не отменено» без проверки результата гейта — то же глушение
   * кода возврата, только в yaml, — пропустило бы и `failure`.
   */
  it('пропуск гейта разрешён только на ручном запуске', () => {
    const gate = jobBody('ci_gate');
    expect(gate).toMatch(/if:\s*\$\{\{\s*github\.event_name == 'push'\s*\}\}/);

    const deploy = jobBody('deploy') ?? '';
    expect(deploy).toMatch(/needs\.ci_gate\.result == 'skipped'/);
    expect(deploy).not.toMatch(/needs\.ci_gate\.result != 'failure'/);
  });

  /**
   * 🔴 И только на `main`. `on: workflow_dispatch` веткой не ограничен, поэтому без этой
   * проверки ручной запуск с любой ветки пропускал бы гейт по `github.event_name == 'push'`
   * и выкатывал непроверенную сборку в один клик — то есть у всего `LEGACY-283` оставался
   * бы штатный обход, да ещё и закреплённый соседней проверкой как правильный.
   */
  it('пропуск гейта не даёт выкатить чужую ветку руками', () => {
    const deploy = jobBody('deploy') ?? '';
    expect(deploy).toMatch(/github\.ref == 'refs\/heads\/main'/);
  });

  /**
   * Отказ самого запроса к GitHub API — это ожидание, а не вердикт: под `set -euo pipefail`
   * голое присваивание роняет весь гейт от одной пятисотки, и выкат отменяется с текстом
   * про красный CI, которого не было. Но отказ обязан быть слышен и различим в сообщении
   * по дедлайну, иначе «я не проверила» выглядит как «прогона не появилось».
   */
  it('недоступность GitHub API считается ожиданием и названа отдельной причиной', () => {
    const gate = jobBody('ci_gate') ?? '';
    expect(gate).toMatch(/api_failed=1/);
    expect(gate).toMatch(/api_failed.*-eq 1/s);
    expect(gate).toMatch(/GitHub API так и не отдал/);
  });

  /** Конвейер правится только в сторону усиления — тот же инвариант, что и у `ci.yml`. */
  it('ни один шаг выката не ослаблен', () => {
    expect(workflow).not.toMatch(/continue-on-error/);
    expect(workflow).not.toMatch(/\|\|\s*true\b/);
    expect(workflow).not.toMatch(/if:\s*false\b/);
  });
});
