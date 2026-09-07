// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * LEGACY-164/165. `AGENTS.md` предписывал команду `npx openapi-typescript ... -o types/api.ts`,
 * которая затирает рукописный `ApiError` и валит половину сборки; `AGENTS.md` и `CODE_STYLE.md`
 * вдобавок ссылались на каталоги, которых на диске нет (`lib/api/`, `styles/variables`,
 * `styles/tokens/<file>.scss`), и на несуществующие токены (`$font-size-md`).
 *
 * 🔴 Сторож ведётся **правилом, а не списком уже совершённых ошибок**. Три редакции подряд
 * ревью пробивало его, и дыра каждый раз была одного вида — покрытие очерчено тем, где уже
 * ошибались: три захардкоженные регулярки на три известных пути; потом сплошной проход, из
 * которого молча выпадало всё, чего нет в корне репозитория; потом проход, читавший только
 * инлайновые кавычки, тогда как обе половины исходного дефекта жили в примерах кода.
 * Отсюда нынешний состав — два сплошных прохода: по путям (кавычки, строки с расширением
 * файла в любом месте документа, импорты `@/styles/**`; разрешение против своего репозитория,
 * репозитория документации и родительской папки) и по `$токенам` `CODE_STYLE.md`.
 * Подробности каждого — в докблоках `pathCandidates` и `documentedPaths` ниже.
 */

const REPO_ROOT = resolve(__dirname, '..');

/**
 * Файлы правил, которые агент читает наравне друг с другом. Третий — `.ai-agent-checklist.md` —
 * назван в LEGACY-164 поимённо: без него команда вернулась бы через него при зелёном `yarn ci`.
 */
const RULE_FILES = ['AGENTS.md', 'CLAUDE.md', 'CODE_STYLE.md', '.ai-agent-checklist.md'];

const read = (file: string): string => readFileSync(resolve(REPO_ROOT, file), 'utf8');

/**
 * Расширения, которыми доводится путь без него: правила пишут модуль (`@/lib/i18n/FlagIcon`),
 * а на диске лежит `FlagIcon.tsx`.
 */
const EXTENSIONS = [
  '',
  '.ts',
  '.tsx',
  '.scss',
  '.module.scss',
  '.mjs',
  '.js',
  '.json',
  '/index.ts',
];

/**
 * Репозиторий документации: правила фронта ссылаются в него постоянно, и пути там
 * отсчитываются от его корня — так объявлено в самом `AGENTS.md` («Documentation repo»).
 * Локально он лежит соседней папкой; в `yarn ci` фронта его нет вовсе, и тогда эта половина
 * прохода пропускается — проверяем то, что можем проверить, там, где можем.
 */
const DOCS_ROOT = resolve(REPO_ROOT, '..', 'books-app-docs');

/** Родительская папка: там лежит обвязка (`.claude/hooks/**`), одна на все три репозитория. */
const PARENT_ROOT = resolve(REPO_ROOT, '..');

/** Корневые каталоги репозитория документации — по ним узнаётся путь, адресованный туда. */
const DOCS_DIRECTORIES = ['ai-context', 'backend', 'frontend', 'history', 'performance'];

/**
 * Кандидаты в пути по всему тексту документа.
 *
 * 🔴 Три источника, и третий появился не для красоты. Первая редакция читала **только**
 * инлайновые обратные кавычки — а обе половины исходного дефекта (`@import '@/styles/variables';`
 * и `// styles/tokens/colors.scss`) жили в примерах кода, где кавычек нет: по `CODE_STYLE.md`
 * проход печатал зелёное, проверив ноль путей (нашло ревью, `git show d2c74b5:CODE_STYLE.md`
 * даёт шесть таких вхождений на базовой ревизии). Поэтому дополнительно берутся строки
 * с расширением файла в любом месте документа и любой импорт `@/styles/**`.
 *
 * Расширение и `@/styles` — не сужение ради тишины, а граница между настоящей ссылкой
 * и выдуманным образцом: примеры в этом документе импортируют несуществующие
 * `@/components/UserCard` и `@/types/user` намеренно, и требовать их существования значило бы
 * заставить документ врать иначе.
 */
const pathCandidates = (text: string): string[] => {
  const found = new Set<string>();

  for (const match of text.matchAll(/`([^`\n]+)`/g)) found.add(match[1]);
  for (const match of text.matchAll(
    /[\w.-]+(?:\/[\w.[\]-]+)+\.(?:tsx?|scss|css|json|mjs|js|md)/g
  )) {
    found.add(match[0]);
  }
  for (const match of text.matchAll(/@\/styles\/[\w./-]+/g)) found.add(match[0]);

  return [...found];
};

/**
 * Пути документа вместе с корнем, от которого каждый отсчитывается.
 *
 * 🔴 Отбор идёт **по первому сегменту**, и это не косметика: первая редакция молча роняла
 * всё, чего не нашла в корне фронта, — то есть опечатка в первом сегменте (`frontend/НЕТ.md`)
 * выпадала из выборки как «чужой путь» и сторож оставался зелёным. Нашло ревью. Теперь чужой
 * путь узнаётся списком корней соседнего репозитория, а не тем, что он не наш.
 *
 * Отбрасываются только строки, которые путями не являются: с пробелами и спецсимволами
 * (правила линта `import/order`, шаблоны маршрутов `/:lang`, имена пакетов `@auth/core`)
 * и плейсхолдеры с `...`.
 */
const documentedPaths = (file: string): Array<{ path: string; bases: string[] }> => {
  const top = new Set(readdirSync(REPO_ROOT));
  const found: Array<{ path: string; bases: string[] }> = [];

  for (const raw of pathCandidates(read(file))) {
    if (/[ *(){}<>$]/.test(raw) || raw.includes('...')) continue;

    const path = raw.replace(/^@\//, '').replace(/^\.\//, '').replace(/\/+$/, '');
    if (!path.includes('/')) continue;

    const first = path.split('/')[0];

    // `.claude` есть и здесь (правила, настройки), и в родительской папке (обвязка на три
    // репозитория) — такой путь законен в любом из двух корней.
    //
    // 🔴 Родительская обвязка проверяется, **только когда она на диске**. В чекауте CI лежит
    // один `books-front`, соседних папок нет вовсе — и путь `.claude/hooks/gates.js`,
    // законный и живой, оказывался «несуществующим»: локально зелено, в CI красное на первом
    // же push. Тот же принцип, что у репозитория документации ниже: проверяем то, что можем
    // проверить, там, где можем, а недоступное пропускаем, а не объявляем сломанным.
    if (first === '.claude') {
      const bases = existsSync(resolve(PARENT_ROOT, '.claude'))
        ? [REPO_ROOT, PARENT_ROOT]
        : [REPO_ROOT];
      if (bases.length > 1 || existsSync(resolve(REPO_ROOT, path))) found.push({ path, bases });
    } else if (top.has(first)) found.push({ path, bases: [REPO_ROOT] });
    else if (DOCS_DIRECTORIES.includes(first) && existsSync(DOCS_ROOT)) {
      found.push({ path, bases: [DOCS_ROOT] });
    }
  }

  return found;
};

describe('LEGACY-164: правила фронта не предписывают затирать types/api.ts', () => {
  /**
   * Ключ ловится в обеих формах и с `./` перед путём: короткая форма из исходного дефекта
   * (`-o types/api.ts`) — лишь одна из трёх записей одной и той же команды.
   */
  it.each(RULE_FILES)('%s не содержит команду генерации с выводом в types/api.ts', (file) => {
    expect(read(file)).not.toMatch(/(?:-o|--output)\s+["']?\.?\/?types\/api\.ts["']?/);
  });
});

describe('LEGACY-165: правила фронта ссылаются на реальные пути', () => {
  it.each(['AGENTS.md', 'CODE_STYLE.md', '.ai-agent-checklist.md'])(
    'каждый путь, названный в %s, существует на диске',
    (file) => {
      const missing = documentedPaths(file)
        .filter(
          ({ path, bases }) =>
            !bases.some((base) =>
              EXTENSIONS.some((extension) => existsSync(resolve(base, path + extension)))
            )
        )
        .map(({ path }) => path);

      expect(missing).toEqual([]);
    }
  );

  /**
   * Проход обязан что-то проверять, и **по каждому файлу отдельно**. Общий счётчик по трём
   * файлам эту роль не исполняет: `CODE_STYLE.md`c нулём проверенных путей прятался за
   * два десятка путей `AGENTS.md`, и ровно так первая редакция и зеленела (нашло ревью).
   */
  /**
   * ⚠️ Пороги стоят с запасом **под чекаут CI**, где соседних репозиториев нет и пути к ним
   * пропускаются: там выборка меньше локальной (15/14/2 против 20/14/2). Порог, поставленный
   * по локальному числу, краснел бы в CI на ровном месте — уже случилось с `.claude/hooks`.
   */
  it.each([
    ['AGENTS.md', 10],
    ['CODE_STYLE.md', 5],
    ['.ai-agent-checklist.md', 1],
  ])('в %s проверено не меньше %i путей', (file, least) => {
    expect(documentedPaths(file).length).toBeGreaterThanOrEqual(least);
  });

  /**
   * Список корней соседнего репозитория — тоже вход, и он тоже протухает: исчезнувший каталог
   * тихо вывел бы из-под охвата все пути, которые на него ссылаются.
   */
  it('каждый корень репозитория документации из списка существует', () => {
    if (!existsSync(DOCS_ROOT)) return;

    const gone = DOCS_DIRECTORIES.filter((dir) => !existsSync(resolve(DOCS_ROOT, dir)));

    expect(gone).toEqual([]);
  });

  it('заголовок "2. Use SCSS features" в CODE_STYLE.md не задвоен', () => {
    expect(read('CODE_STYLE.md').match(/^### 2\. Use SCSS features$/gm) ?? []).toHaveLength(1);
  });
});

/**
 * Раздел про токены в `CODE_STYLE.md` подписан выдержкой из `styles/tokens.scss`, и агент
 * берёт имена оттуда как есть. Пока путь в подписи был вымышленный, блок читался иллюстрацией;
 * с настоящим путём несуществующее имя (`$font-size-md` при живом `$font-size-base`) роняет
 * **сборку** на «Undefined variable», а не линт. Нашло ревью в этом же заходе.
 */
describe('токены из CODE_STYLE.md существуют в styles/tokens.scss', () => {
  it('каждое имя $token из документа объявлено в файле токенов', () => {
    const declared = new Set(
      [...read('styles/tokens.scss').matchAll(/^\$([a-z0-9-]+):/gm)].map((match) => match[1])
    );
    const used = [
      ...new Set([...read('CODE_STYLE.md').matchAll(/\$([a-z][a-z0-9-]*)/g)].map((m) => m[1])),
    ];

    expect(used.length).toBeGreaterThan(10);
    expect(used.filter((name) => !declared.has(name))).toEqual([]);
  });
});
