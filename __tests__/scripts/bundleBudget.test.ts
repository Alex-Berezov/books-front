// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as budget from '@/scripts/lib/bundle-budget.mjs';

/**
 * Сторож бюджета бандла (`LEGACY-016`, пачка `Q3`, решение арбитра 09.09.2026).
 *
 * `next build` печатает таблицу First Load JS с самого начала, но вывод никто не читает:
 * страница, потяжелевшая вдвое от случайно утянутого импорта, не оставляла следа ни
 * в диффе, ни в прогоне. Снимок по каждому роуту (`scripts/bundle-baseline.json`) молча
 * разойтись не может — новая цифра приезжает строкой диффа.
 *
 * Здесь проверяется логика сравнения и то, что шаг заведён в `build`. Сам замер (gzip
 * по `.next/`) живёт в CLI и посажен пробой на отказ, а не спекой: без настоящей сборки
 * проверять там нечего.
 */
const ROOT = resolve(__dirname, '..', '..');
const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const scripts = packageJson.scripts as Record<string, string>;

type Sizes = Record<string, number>;
const routeNameFromManifestKey = budget.routeNameFromManifestKey as (k: string) => string | null;
const firstLoadBytes = budget.firstLoadBytes as (
  files: string[],
  gzipSizeOf: (file: string) => number
) => number;
const collectRouteSizes = budget.collectRouteSizes as (
  pages: Record<string, string[]>,
  gzipSizeOf: (file: string) => number
) => Sizes;
const compareToBaseline = budget.compareToBaseline as (
  current: Sizes,
  baseline: Sizes,
  tolerance?: number
) => { kind: string; route: string; message: string }[];
const TOLERANCE_BYTES = budget.TOLERANCE_BYTES as number;
const shouldAcceptUpdate = budget.shouldAcceptUpdate as (
  updateRequested: boolean,
  inCi: boolean
) => boolean;

/**
 * 🔴 Допуск закреплён литералом, а не взят из самой константы. Файл лежит вне маски
 * `scripts/check-*.mjs`, то есть `protect-files.js` его не стережёт; сверка «допуск равен
 * допуску» оставила бы прогон зелёным при поднятии константы до любого числа, и гейт,
 * стоящий на пути выката, снимался бы правкой одной строки. Поднимать это число нельзя:
 * красное чинится причиной (`yarn bundle:snapshot` на объяснимом росте), а не допуском.
 */
describe('допуск закреплён', () => {
  it('равен 10 kB', () => {
    expect(TOLERANCE_BYTES).toBe(10_000);
  });
});

describe('обновление снимка', () => {
  it('без запроса снимок не переписывается', () => {
    expect(shouldAcceptUpdate(false, false)).toBe(false);
  });

  it('по запросу вне CI — переписывается', () => {
    expect(shouldAcceptUpdate(true, false)).toBe(true);
  });

  /**
   * Главная гарантия всей проверки: снимок, переписывающий себя на конвейере, — это
   * ожидание, подогнанное под изменившийся код, то есть проверка, которая не может
   * покраснеть. Приём взят с `openapi-snapshot.spec.ts` бэкенда.
   */
  it('по запросу в CI — НЕ переписывается', () => {
    expect(shouldAcceptUpdate(true, true)).toBe(false);
  });
});

describe('имя роута из ключа манифеста', () => {
  it('страница верхнего уровня зовётся корнем', () => {
    expect(routeNameFromManifestKey('/page')).toBe('/');
  });

  it('вложенная страница теряет только хвост /page', () => {
    expect(routeNameFromManifestKey('/admin/[lang]/books/versions/new/page')).toBe(
      '/admin/[lang]/books/versions/new'
    );
  });

  /**
   * Раскладка, ошибка, загрузка и «не найдено» — куски страницы, а не первый её загруз.
   * Приняв их за роуты, снимок судил бы то, чего в таблице `next build` нет вовсе.
   */
  it.each(['/layout', '/error', '/[lang]/authors/loading', '/admin/[lang]/not-found'])(
    'служебный вход %s роутом не считается',
    (key) => {
      expect(routeNameFromManifestKey(key)).toBeNull();
    }
  );
});

describe('вес первого загруза', () => {
  const sizeOf = (file: string) => ({ 'a.js': 100, 'b.js': 250, 'c.css': 900 })[file] ?? 0;

  it('складывает только JS', () => {
    expect(firstLoadBytes(['a.js', 'b.js', 'c.css'], sizeOf)).toBe(350);
  });

  it('один и тот же файл считается один раз', () => {
    expect(firstLoadBytes(['a.js', 'a.js', 'b.js'], sizeOf)).toBe(350);
  });

  it('собирает размеры по всем записям страниц манифеста', () => {
    const sizes = collectRouteSizes(
      { '/page': ['a.js'], '/[lang]/x/page': ['a.js', 'b.js'], '/layout': ['b.js'] },
      sizeOf
    );
    expect(sizes).toEqual({ '/': 100, '/[lang]/x': 350 });
  });
});

describe('сверка со снимком', () => {
  const baseline: Sizes = { '/': 100_000, '/[lang]/book/[slug]': 200_000 };

  it('совпадение со снимком — зелёное', () => {
    expect(compareToBaseline({ ...baseline }, baseline)).toEqual([]);
  });

  it('усадка в пределах допуска ничего не ломает', () => {
    expect(compareToBaseline({ ...baseline, '/': 100_000 - 10_000 }, baseline)).toEqual([]);
  });

  /**
   * Односторонний допуск копил бы люфт ровно на тех роутах, которые чинили: разгрузили
   * страницу вдвое — снимок остался прежним, и случайный тяжёлый импорт, вернувший её
   * почти к старому весу, прошёл бы зелёным.
   */
  it('усадка сверх допуска — красное с требованием переснять снимок', () => {
    const failures = compareToBaseline({ ...baseline, '/': 40_000 }, baseline);
    expect(failures).toHaveLength(1);
    expect(failures[0].kind).toBe('shrank');
    expect(failures[0].message).toContain('bundle:snapshot');
  });

  /**
   * Допуск взят абсолютным, а не долей: 5 % на тяжёлом админском редакторе — это +32 kB,
   * то есть ровно цена случайно утянутого тяжёлого импорта. Нулевой зазор повторил бы
   * `LEGACY-078`, где порог краснел от каждого коммита и приучил игнорировать CI.
   */
  it('рост ровно на допуск — зелёное', () => {
    const current = { ...baseline, '/': 100_000 + 10_000 };
    expect(compareToBaseline(current, baseline)).toEqual([]);
  });

  it('рост на байт сверх допуска — красное, с именем роута и дельтой', () => {
    const current = { ...baseline, '/': 100_000 + 10_000 + 1 };
    const failures = compareToBaseline(current, baseline);
    expect(failures).toHaveLength(1);
    expect(failures[0].kind).toBe('grew');
    expect(failures[0].route).toBe('/');
    expect(failures[0].message).toContain('110.0 kB');
  });

  /**
   * Две структурные причины краснеют наравне с ростом: снимок, судящий исчезнувший роут,
   * и роут, которого никто ни разу не мерил, — обе превращают бюджет в проверку,
   * не способную покраснеть.
   */
  it('роут снимка, которого нет в сборке, — красное', () => {
    const failures = compareToBaseline({ '/': 100_000 }, baseline);
    expect(failures.map((f) => f.kind)).toEqual(['missing']);
    expect(failures[0].route).toBe('/[lang]/book/[slug]');
  });

  it('роут сборки, которого нет в снимке, — красное', () => {
    const failures = compareToBaseline({ ...baseline, '/[lang]/new': 300_000 }, baseline);
    expect(failures.map((f) => f.kind)).toEqual(['unknown']);
    expect(failures[0].route).toBe('/[lang]/new');
  });
});

describe('шаг заведён в сборке и не ослаблен', () => {
  it('build зовёт проверку после next build', () => {
    expect(
      scripts.build,
      'из build пропала проверка бюджета — таблицу First Load JS снова никто не читает'
    ).toContain('node scripts/bundle-budget.mjs');
    expect(scripts.build.indexOf('next build')).toBeLessThan(
      scripts.build.indexOf('bundle-budget.mjs')
    );
  });

  /**
   * Сверка точной строкой, а не чёрным списком ослаблений. Список ловит только то, что
   * в него внесли, и молчит на любом способе, которого автор списка не предвидел; точная
   * строка краснеет на **любом** отличии — приписанном хвосте, гасящем код возврата,
   * подменённом разделителе, добавленном ключе, снятом шаге.
   *
   * Разделитель обязан быть `&&`: при `;` или при хвосте, глушащем код возврата, отказ
   * бюджета перестаёт менять исход сборки, и красное становится строкой в логе, которую
   * никто не читает, — тем самым состоянием, ради выхода из которого шаг и заведён.
   */
  it('строка build ровно та, что задумана', () => {
    expect(scripts.build).toBe(
      'next build && node scripts/homepage-content-guard.mjs && node scripts/bundle-budget.mjs'
    );
  });

  /**
   * Порядок звеньев значим дважды. Содержательная проверка главной (`LEGACY-103`) читает
   * артефакты `.next/server/app/<lang>.html`, поэтому идёт после сборки. И она же обязана
   * идти **до** бюджета: yarn 1 приклеивает лишние аргументы к концу всей строки скрипта,
   * то есть `yarn bundle:snapshot` (`yarn build --update`) отдаёт `--update` последнему звену.
   * Окажись последним сторож главной — он проглотит флаг молча, снимок не перепишется,
   * а бюджет упадёт с советом запустить ровно ту команду, которая только что не сработала.
   */
  it('гейт содержательности главной стоит между сборкой и бюджетом', () => {
    const steps = scripts.build.split('&&').map((step) => step.trim());
    const guard = steps.indexOf('node scripts/homepage-content-guard.mjs');
    const budget = steps.indexOf('node scripts/bundle-budget.mjs');

    expect(guard).toBeGreaterThan(steps.indexOf('next build'));
    expect(budget).toBeGreaterThan(guard);
    expect(budget).toBe(steps.length - 1);
  });

  it('обновление снимка — отдельная команда, а не часть сборки', () => {
    expect(scripts['bundle:snapshot']).toContain('--update');
  });

  /**
   * Снимок снимается **той же** сборкой, которую судит бюджет: `bundle:snapshot` зовёт
   * `yarn build`, а не переобъявляет его состав. Своя копия строки разошлась бы с оригиналом
   * при первой правке `build` — начиная с `prebuild`, который на прямой вызов `next build`
   * не вешается вовсе, — и бюджет краснел бы на разнице двух команд, а не на коде.
   */
  it('снимок снимается через yarn build, а не своей копией состава сборки', () => {
    expect(scripts['bundle:snapshot']).toContain('yarn build');
    expect(scripts['bundle:snapshot']).not.toContain('next build');
  });
});
