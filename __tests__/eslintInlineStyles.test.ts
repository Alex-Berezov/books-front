import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 LEGACY-158. Запрет инлайн-стилей был объявлен в AGENTS.md и CODE_STYLE.md, а
 * стерёг его один тест на один компонент: в любом другом файле `style={{ ... }}`
 * проходил линт, типы и тесты. Теперь запрет держит правило
 * `react/forbid-dom-props` уровнем `error`, а накопленный долг понижен до `warn`
 * списком файлов в `.eslintrc.json`.
 *
 * Сторож нужен потому, что сам по себе такой список — дыра с ручкой изнутри:
 * дописать в него файл дешевле, чем убрать инлайн-стиль. Проверяется поэтому не
 * текст конфигурации, а три свойства сразу:
 *
 * 1. файл **вне** списка роняет линт ошибкой, а не предупреждением;
 * 2. список **не растёт** — он обязан быть подмножеством долга на день введения
 *    правила (эталон ниже);
 * 3. в списке нет мёртвых записей — файл без нарушений из него убирают, иначе
 *    список перестаёт означать долг и снова разрешает инлайн-стиль молча.
 */

const REPO_ROOT = resolve(__dirname, '..');
const RULE = 'react/forbid-dom-props';
const BACKSLASH = String.fromCharCode(92);
const POSIX_ROOT = REPO_ROOT.split(BACKSLASH).join('/');

/**
 * Долг на 26.08.2026, собранный самим ESLint, а не поиском по тексту: правило
 * запрещает `style` на элементах DOM, а `style` на компоненте нарушением не
 * является, и `grep` эти случаи не различает.
 *
 * ⚠️ Список правится **только в сторону сокращения** (разбор идёт по LEGACY-050).
 * Пополнение эталона вместе с конфигурацией снимает сторож целиком — тогда
 * правило снова ничего не стережёт, ради чего запись 158 и заводилась.
 */
const DEBT_AT_INTRODUCTION = [
  'app/[lang]/auth/register/RegisterClient.tsx',
  'app/[lang]/auth/sign-in/SignInClient.tsx',
  'app/[lang]/book/[slug]/listen/ListenClient.tsx',
  'app/[lang]/book/[slug]/page.tsx',
  'app/[lang]/book/[slug]/read/ReaderClient.tsx',
  'app/[lang]/bookshelf/BookshelfClient.tsx',
  'app/[lang]/deletion/page.tsx',
  'app/[lang]/privacy/page.tsx',
  'app/[lang]/profile/ProfileClient.tsx',
  'app/[lang]/terms/page.tsx',
  'app/admin/[lang]/error.tsx',
  'app/admin/[lang]/media/page.tsx',
  'components/admin/AdminShell/AdminTopBar/AdminTopBar.tsx',
  'components/admin/AdminShell/PurgeCacheButton/PurgeCacheButton.tsx',
  'components/admin/authors/AuthorList/AuthorList.tsx',
  'components/admin/books/BookForm/DetailInfoSection.tsx',
  'components/admin/books/ListenContentTab/AudioPicker.tsx',
  'components/admin/categories/CategoryTranslationsModal/TranslationForm.tsx',
  'components/admin/categories/CategoryTree/CategoryTree.tsx',
  'components/admin/categories/CategoryTree/CategoryTreeNode.tsx',
  'components/admin/comments/CommentsList.tsx',
  'components/admin/media/MediaList.tsx',
  'components/admin/media/UploadProgress.tsx',
  'components/admin/shared/Skeleton/Skeleton.tsx',
  'components/admin/tags/TagTranslationsModal/TranslationForm.tsx',
  'components/public/layout/Footer.tsx',
  'components/public/layout/Header.tsx',
];

interface LintMessage {
  ruleId: string | null;
  severity: number;
}

interface LintResult {
  filePath: string;
  messages: LintMessage[];
}

interface EslintApi {
  calculateConfigForFile(file: string): Promise<{ rules?: Record<string, unknown[]> }>;
  lintFiles(files: string[]): Promise<LintResult[]>;
  lintText(text: string, options: { filePath: string }): Promise<LintResult[]>;
}

/**
 * ⚠️ `require`, а не `import`: пакета `@types/eslint` в зависимостях нет, ставить его ради
 * теста нельзя. Тот же приём и по той же причине — в `__tests__/lint-coverage.test.ts`.
 */
const eslint: EslintApi = new (createRequire(resolve(REPO_ROOT, 'package.json'))('eslint').ESLint)({
  cwd: REPO_ROOT,
});

/**
 * Уровень правила спрашивается у самого ESLint, а не вычитывается из
 * `.eslintrc.json`: текст конфигурации — jsonc с комментариями, а главное —
 * понизить уровень можно и мимо этого блока, вторым override. Сторож обязан
 * видеть итоговое поведение линта на файле.
 */
const severityFor = async (file: string): Promise<'error' | 'warn' | 'off'> => {
  const config = (await eslint.calculateConfigForFile(resolve(REPO_ROOT, file))) as {
    rules?: Record<string, unknown[]>;
  };
  const level = config.rules?.[RULE]?.[0];

  if (level === 2 || level === 'error') return 'error';
  if (level === 1 || level === 'warn') return 'warn';
  return 'off';
};

/**
 * Каталоги, в которые линт не заходит: артефакты сборки и чужие копии кода. Список
 * тот же, что в `__tests__/lint-coverage.test.ts`, и по той же причине - см. LEGACY-287,
 * где эта обвязка предложена к сведению в один модуль.
 */
const NOT_SOURCE = new Set([
  'node_modules',
  '.next',
  '.claude',
  '.yarn-cache',
  '.git',
  '.github',
  '.husky',
  '.vscode',
  'coverage',
  'playwright-report',
  'test-results',
  'public',
]);

const sourceTsxFiles = (dir: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(resolve(REPO_ROOT, dir), { withFileTypes: true })) {
    const relative = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...sourceTsxFiles(relative));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(relative);
    }
  }

  return files;
};

/**
 * ⚠️ Дерево обходится целиком, а не по списку каталогов продукта. Жёсткий перечень
 * `['app', 'components', 'lib', 'providers']` оставлял бы дыру ровно того размера,
 * что и сама запись: понижение правила для файла из `api/`, `types/` или `__tests__/`
 * не видел бы ни один случай сторожа, а `yarn lint` остался бы зелёным.
 */
const allTsxFiles = (): string[] =>
  readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NOT_SOURCE.has(entry.name))
    .flatMap((entry) => sourceTsxFiles(entry.name));

describe('запрет инлайн-стилей стережёт линт, а не один тест (LEGACY-158)', () => {
  it('файл вне списка долга роняет линт ошибкой', async () => {
    // Проверяется текстом, а не временным файлом: файл-проба внутри репозитория
    // остаётся мусором при обрыве прогона и попадает под соседний тест этого же
    // файла. Путь при этом обязан быть **существующим** — конфигурация линта
    // типозависима (`parserOptions.project`), и на пути, которого нет в программе
    // TypeScript, разбор падает до того, как правило успеет сработать.
    const probePath = allTsxFiles().find((file) => !DEBT_AT_INTRODUCTION.includes(file));
    expect(probePath, 'в дереве не нашлось ни одного файла вне списка долга').toBeDefined();

    const [result] = await eslint.lintText(
      'export const InlineStyleProbe = () => <div style={{ marginLeft: 4 }} />;',
      { filePath: resolve(REPO_ROOT, probePath as string) }
    );
    const messages = result.messages.filter((message) => message.ruleId === RULE);

    expect(messages).toHaveLength(1);
    // severity 2 — ошибка. Понижение правила до `warn` глобально оставило бы
    // `yarn lint` зелёным: он идёт без `--max-warnings` (LEGACY-182).
    expect(messages[0]?.severity).toBe(2);
  }, 60_000);

  it('список долга не растёт: пониженный уровень только у файлов долга', async () => {
    const sources = allTsxFiles();
    // ⚠️ Нижняя граница обязательна: без неё проверка зеленеет на пустом множестве —
    // переехавший каталог или сломанный обход дерева делают сторож немым, а не красным.
    expect(sources.length).toBeGreaterThan(200);

    const lowered: string[] = [];

    for (const file of sources) {
      if ((await severityFor(file)) !== 'error') lowered.push(file);
    }

    expect(lowered.filter((file) => !DEBT_AT_INTRODUCTION.includes(file))).toEqual([]);
  }, 60_000);

  it('каждая запись долга применяется и нужна', async () => {
    // Та же причина, что и в проверке выше: список, ставший пустым, обязан ронять
    // сторож, а не проходить его.
    expect(DEBT_AT_INTRODUCTION.length).toBeGreaterThan(0);

    const results = await eslint.lintFiles(
      DEBT_AT_INTRODUCTION.map((file) => resolve(REPO_ROOT, file))
    );
    expect(results).toHaveLength(DEBT_AT_INTRODUCTION.length);

    const violating = new Set(
      results
        .filter((result) => result.messages.some((message) => message.ruleId === RULE))
        .map((result) => result.filePath.split(BACKSLASH).join('/').replace(`${POSIX_ROOT}/`, ''))
    );

    const notLowered: string[] = [];
    const dead: string[] = [];

    for (const file of DEBT_AT_INTRODUCTION) {
      const severity = await severityFor(file);

      // 🔴 Дефект, который эта проверка и поймала при написании: путь
      // `app/[lang]/...` в поле `files` — не путь, а glob, и квадратные скобки в
      // нём читаются как класс символов. Двадцать записей долга не применялись,
      // `yarn lint` краснел, а конфигурация выглядела правильной.
      if (violating.has(file) && severity !== 'warn') notLowered.push(file);
      // Запись, под которой нарушения больше нет, обязана быть удалена: иначе
      // список перестаёт означать долг и снова разрешает инлайн-стиль молча.
      if (!violating.has(file) && severity === 'warn') dead.push(file);
    }

    expect(notLowered, 'запись есть, но не применяется — проверьте экранирование скобок').toEqual(
      []
    );
    expect(dead, 'файл разобран — уберите его из списка в .eslintrc.json').toEqual([]);
  }, 120_000);
});
