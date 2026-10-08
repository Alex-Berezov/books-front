// @vitest-environment node
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// 🔴 LEGACY-442: antd — библиотека одной админки. Запрет импорта на сайте держит
// `no-restricted-imports` в `.eslintrc.json`; откат правила или расширение зоны
// исключения бесшумны — `yarn lint` остаётся зелёным, поэтому держит их этот сторож.

const REPO_ROOT = resolve(__dirname, '..');

// Существующие файлы: правила берут зону (`files` в `overrides`) по пути пробы.
const PUBLIC_PROBES = [
  'app/[lang]/book/[slug]/BookActions.tsx',
  'components/common/FaqBlock/FaqBlock.tsx',
  'components/public/layout/Header.tsx',
  'lib/utils/toast.ts',
  'providers/AppProviders.tsx',
];
const ADMIN_PROBES = [
  'app/admin/[lang]/error.tsx',
  'components/admin/common/Button/Button.tsx',
  'providers/LazyConfigProvider.tsx',
];

const IMPORTS = [
  "import { Button } from 'antd';\nexport const probe = Button;\n",
  "import type { ButtonType } from 'antd/es/button';\nexport type Probe = ButtonType;\n",
  "import { BookOutlined } from '@ant-design/icons';\nexport const probe = BookOutlined;\n",
  "export { Button } from 'antd';\n",
];

// Админские компоненты построены на antd: импорт их с сайта возвращает antd в бандл
// в обход запрета самого antd (так были устроены common/Modal и common/SlugInput).
const ADMIN_IMPORTS = [
  "import { Button } from '@/components/admin/common/Button';\nexport const probe = Button;\n",
  "import { Modal } from '@/components/admin/common/Modal';\nexport const probe = Modal;\n",
  "export { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';\n",
  "export * from '@/components/admin';\n",
  "export { default } from '@/app/admin/[lang]/error';\n",
  // Относительный путь обходил бы шаблоны с алиасом `@/`.
  "import { Button } from '../../components/admin/common/Button';\nexport const probe = Button;\n",
];

// Тесты админки законно импортируют её код, но не antd.
const TEST_PROBE = '__tests__/eslintAntdBoundary.test.ts';

interface LintMessage {
  ruleId: string | null;
  severity: number;
}

interface EslintApi {
  lintText(
    text: string,
    options: { filePath: string }
  ): Promise<Array<{ messages: LintMessage[] }>>;
}

// `require`, а не `import`: `@types/eslint` в зависимостях нет (тот же приём — `eslintA11yRules.test.ts`).
//
// ⚠️ Разбор без типов: правилам импорта TypeScript-программа не нужна, а с ней каждый
// `lintText` строит её заново — первая версия сторожа занимала процессор CI на полторы
// минуты и роняла по таймауту соседние тяжёлые тесты. Снимается только `project` и
// правило override, которому нужны типы (`return-await`; появится второе — дописать сюда); запреты импорта и их зоны — из настоящего
// `.eslintrc.json`, как есть.
const eslint: EslintApi = new (createRequire(resolve(REPO_ROOT, 'package.json'))('eslint').ESLint)({
  cwd: REPO_ROOT,
  overrideConfig: {
    parserOptions: { project: null },
    rules: { '@typescript-eslint/return-await': 'off' },
  },
});

const restricted = async (
  code: string,
  path: string,
  ruleId = 'no-restricted-imports'
): Promise<LintMessage[]> => {
  const [result] = await eslint.lintText(code, { filePath: resolve(REPO_ROOT, path) });
  // Упавший разбор даёт сообщение без правила: отфильтрованный пустой список выглядел бы
  // как «разрешено», хотя правило не запускалось вовсе.
  expect(
    result.messages.filter((message) => message.ruleId === null),
    code
  ).toEqual([]);
  return result.messages.filter((message) => message.ruleId === ruleId);
};

// Относительный путь, который не содержит `components/admin` строкой: его ловит только
// `import/no-restricted-paths` по настоящему пути файла. Пары «файл — импорт из него».
const RELATIVE_ADMIN_IMPORTS: Array<[string, string]> = [
  [
    'components/common/FaqBlock/FaqBlock.tsx',
    "import { Modal } from '../../admin/common/Modal';\nexport const probe = Modal;\n",
  ],
  [
    'app/[lang]/book/[slug]/BookActions.tsx',
    "import Probe from '../../../admin/[lang]/error';\nexport const probe = Probe;\n",
  ],
];

describe('antd только в админке (LEGACY-442)', () => {
  it.each(PUBLIC_PROBES)('вне админки импорт antd — ошибка линта: %s', async (path) => {
    for (const code of IMPORTS) {
      const messages = await restricted(code, path);
      expect(messages, code).toHaveLength(1);
      expect(messages[0].severity).toBe(2);
    }
  });

  it.each(ADMIN_PROBES)('в админке и её теме импорт antd разрешён: %s', async (path) => {
    for (const code of IMPORTS) {
      expect(await restricted(code, path), code).toHaveLength(0);
    }
  });

  it.each(PUBLIC_PROBES)(
    'вне админки импорт админских компонентов — ошибка линта: %s',
    async (path) => {
      for (const code of ADMIN_IMPORTS) {
        const messages = await restricted(code, path);
        expect(messages, code).toHaveLength(1);
        expect(messages[0].severity).toBe(2);
      }
    }
  );

  it.each(ADMIN_PROBES)('в админке её компоненты импортируются свободно: %s', async (path) => {
    for (const code of ADMIN_IMPORTS) {
      expect(await restricted(code, path), code).toHaveLength(0);
    }
  });

  it('в тестах админский код разрешён, а antd — нет', async () => {
    for (const code of ADMIN_IMPORTS) {
      expect(await restricted(code, TEST_PROBE), code).toHaveLength(0);
    }
    for (const code of IMPORTS) {
      expect(await restricted(code, TEST_PROBE), code).toHaveLength(1);
    }
  });

  it.each(RELATIVE_ADMIN_IMPORTS)(
    'относительный импорт админки с сайта — ошибка по настоящему пути: %s',
    async (path, code) => {
      const messages = await restricted(code, path, 'import/no-restricted-paths');
      expect(messages, code).toHaveLength(1);
      expect(messages[0].severity).toBe(2);
    }
  );

  it('внутри админки тот же относительный импорт разрешён', async () => {
    const messages = await restricted(
      "import { Modal } from '../Modal';\nexport const probe = Modal;\n",
      'components/admin/common/Button/Button.tsx',
      'import/no-restricted-paths'
    );
    expect(messages).toHaveLength(0);
  });

  it('чистый импорт на сайте правило не задевает', async () => {
    const messages = await restricted(
      "import { BookOpen } from 'lucide-react';\nexport const probe = BookOpen;\n",
      'components/common/FaqBlock/FaqBlock.tsx'
    );
    expect(messages).toHaveLength(0);
  });
});
