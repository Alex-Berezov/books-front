// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож детектора недостижимых модулей (`LEGACY-106`).
 *
 * 🔴 До 06.09.2026 мёртвый модуль не видела ни одна проверка: он синтаксически корректен,
 * типы сходятся, тесты его не трогают. Восемь записей одного класса (`013`, `014`, `047`,
 * `048`, `049`, `051`, `055`, `066`) накопились за два месяца и закрылись ручной уборкой —
 * каждая находилась случайно, при работе по соседству. Цена не в занятом месте: мёртвый
 * файл неотличим от живого в поиске по коду, и правка уходит в мёртвую копию.
 *
 * Проверять связь шага с конвейером нечем, кроме сторожа по тексту: ни `tsc`, ни `eslint`,
 * ни vitest не разбирают `package.json` как конвейер. Поэтому каждое утверждение ищет
 * свой кусок отдельно — сломается разбор, будет видно, что сломался разбор, а не
 * «всё в порядке».
 *
 * Проба на отказ 06.09.2026: на чистом дереве `yarn check:dead-modules` — код возврата 0;
 * с добавленным `lib/__dead-module-probe.ts` — `Unused files (1)` и код возврата 1.
 */
const ROOT = resolve(__dirname, '..');
const packageJson = readFileSync(resolve(ROOT, 'package.json'), 'utf8');
const knipConfig = readFileSync(resolve(ROOT, 'knip.jsonc'), 'utf8');

const scripts = JSON.parse(packageJson).scripts as Record<string, string>;

/** Ослабления, любое из которых превращает гейт в украшение. */
const WEAKENINGS = ['|| true', 'continue-on-error', '--no-exit-code', '--no-gitignore'];

describe('детектор мёртвых модулей: шаг заведён и не ослаблен', () => {
  it('скрипт check:dead-modules существует и зовёт knip', () => {
    expect(
      scripts['check:dead-modules'],
      'скрипта check:dead-modules нет — мёртвые модули снова ищет только человек'
    ).toBeDefined();
    expect(scripts['check:dead-modules']).toContain('knip');
  });

  /**
   * Скоуп узкий намеренно: `--include files` — это про недостижимые файлы, ради которых
   * заведена запись. Неиспользуемые экспорты и типы (44 и 87 на 06.09.2026) — отдельный
   * и куда более шумный класс, включать его сюда за компанию нельзя.
   */
  it('скоуп ограничен файлами, а не экспортами', () => {
    expect(scripts['check:dead-modules']).toContain('--include files');
  });

  /**
   * Того, что шаг стоит внутри `yarn ci`, здесь нет намеренно: состав `yarn ci` ведёт
   * `__tests__/lint-coverage.test.ts` — единственный реестр шагов (`LEGACY-155`). Второй
   * список того же самого разошёлся бы с первым при первой же правке одного из них, и
   * ответ на вопрос «что входит в `yarn ci`» давали бы два файла, ни один не полный.
   *
   * 🔴 Почему состав вообще стерегут: `yarn ci` зовут оба пути — и `ci.yml`, и `deploy.yml`.
   * Шаг, заведённый мимо него, на втором пути отсутствовал бы молча — ровно так уезжали
   * релизы мимо проверки (`LEGACY-078`, `LEGACY-207`, `LEGACY-209`).
   */
  it.each(WEAKENINGS)('в шаге нет ослабления %s', (weakening) => {
    expect(scripts['check:dead-modules']).not.toContain(weakening);
    expect(scripts.ci).not.toContain(weakening);
  });

  it('версия knip зафиксирована, а не плавает', () => {
    const devDeps = JSON.parse(packageJson).devDependencies as Record<string, string>;
    expect(
      devDeps.knip,
      'knip не в devDependencies — версия поедет вместе с реестром'
    ).toBeDefined();
    expect(
      devDeps.knip,
      'диапазон версий делает гейт недетерминированным: новая версия краснеет сама по себе'
    ).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('исключения детектора названы поимённо и с причиной', () => {
  /**
   * Baseline здесь запрещён решением арбитра 06.09.2026: список исключений и есть та
   * невидимость, против которой заведена запись. Исключения — только намеренно
   * не импортируемый код, и у каждого рядом причина.
   */
  it('исключений ровно два и оба — намеренно отложенный код', () => {
    const ignore = JSON.parse(knipConfig.replace(/^\s*\/\/.*$/gm, '')).ignore as string[];

    expect(ignore).toEqual(['lib/auth/session-utils.ts', 'lib/http.examples.ts']);
  });

  it.each(['lib/auth/session-utils.ts', 'lib/http.examples.ts'])(
    'у исключения %s есть причина в комментарии рядом',
    (path) => {
      const at = knipConfig.indexOf(`"${path}"`);
      expect(at).toBeGreaterThan(-1);

      const before = knipConfig.slice(0, at);
      const comment = before.slice(before.lastIndexOf('//'));
      expect(
        comment.length,
        'исключение без причины через полгода неотличимо от забытого'
      ).toBeGreaterThan(20);
    }
  );
});
