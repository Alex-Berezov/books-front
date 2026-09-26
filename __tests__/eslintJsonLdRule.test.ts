// @vitest-environment node
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// 🔴 LEGACY-419: голый `JSON.stringify` в `dangerouslySetInnerHTML` пропускает `</script>` из текста админки.
// Откат правила в `.eslintrc.json` бесшумен — `yarn lint` остаётся зелёным, поэтому держит его этот сторож.

const REPO_ROOT = resolve(__dirname, '..');
// Существующий файл: конфигурация типозависима, на пути вне программы TypeScript разбор падает до правила.
const PROBE_PATH = resolve(REPO_ROOT, 'components/common/FaqBlock/FaqBlock.tsx');

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
const eslint: EslintApi = new (createRequire(resolve(REPO_ROOT, 'package.json'))('eslint').ESLint)({
  cwd: REPO_ROOT,
});

const restricted = async (code: string): Promise<LintMessage[]> => {
  const [result] = await eslint.lintText(code, { filePath: PROBE_PATH });
  return result.messages.filter((message) => message.ruleId === 'no-restricted-syntax');
};

describe('JSON-LD выводится только через serializeJsonLd (LEGACY-419)', () => {
  it('голый JSON.stringify в dangerouslySetInnerHTML — ошибка линта', async () => {
    const messages = await restricted(
      'export const Probe = ({ v }: { v: object }) => (\n' +
        '  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(v) }} />\n' +
        ');\n'
    );

    // На <script> срабатывают оба селектора: голый JSON.stringify и тело не через serializeJsonLd.
    expect(messages.length).toBe(2);
    expect(messages.every((m) => m.severity === 2)).toBe(true);
  }, 120_000);

  it('JSON.stringify внутри вложенного объекта тоже ловится', async () => {
    const messages = await restricted(
      'export const Probe = ({ v }: { v: object }) => (\n' +
        '  <script\n' +
        '    type="application/ld+json"\n' +
        "    dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@graph': [v] }) }}\n" +
        '  />\n' +
        ');\n'
    );

    expect(messages.length).toBe(2);
  }, 120_000);

  it('голый JSON.stringify в dangerouslySetInnerHTML не на <script> ловится первым правилом', async () => {
    const messages = await restricted(
      'export const Probe = ({ v }: { v: object }) => (\n' +
        '  <div dangerouslySetInnerHTML={{ __html: JSON.stringify(v) }} />\n' +
        ');\n'
    );

    expect(messages.length).toBe(1);
  }, 120_000);

  it('строка, собранная заранее в переменной, в теле <script> тоже ловится', async () => {
    const messages = await restricted(
      'export const Probe = ({ v }: { v: object }) => {\n' +
        '  const html = JSON.stringify(v);\n' +
        '  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />;\n' +
        '};\n'
    );

    expect(messages.length).toBe(1);
  }, 120_000);

  it('вывод через serializeJsonLd проходит', async () => {
    const messages = await restricted(
      "import { serializeJsonLd } from '@/lib/utils/json-ld';\n" +
        'export const Probe = ({ v }: { v: object }) => (\n' +
        '  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(v) }} />\n' +
        ');\n'
    );

    expect(messages).toEqual([]);
  }, 120_000);
});
