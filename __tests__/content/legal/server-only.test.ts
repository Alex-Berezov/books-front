// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const SOURCE_DIRS = ['api', 'app', 'components', 'lib', 'hooks', 'providers', 'content', 'styles'];
const SKIPPED = new Set(['node_modules', '.next']);

const collect = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

// The directive may follow a leading comment block (several client files start with one).
const LEADING_COMMENTS = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/;
const isClientModule = (source: string) =>
  /^(['"])use client\1/.test(source.replace(LEADING_COMMENTS, ''));

// Any value import of the legal texts: the `@/` alias or a relative path, static import,
// re-export or dynamic import. `import type` is erased at build time and does not count.
const LEGAL_IMPORT =
  /(?:^|\n)\s*(?:import(?!\s+type\b)[^;]*?\bfrom|export[^;]*?\bfrom|[^\n]*\bimport\s*\()\s*['"](?:@\/|(?:\.{1,2}\/)+)content\/legal/;

describe('legal texts stay on the server', () => {
  it('every document module opens with the server-only guard', () => {
    const modules = collect(path.join(ROOT, 'content/legal')).filter(
      (file) => !['types.ts', 'index.ts'].includes(path.basename(file))
    );
    expect(modules.length).toBeGreaterThan(0);
    const unguarded = modules.filter(
      (file) => !readFileSync(file, 'utf8').startsWith("import 'server-only';")
    );
    expect(unguarded.map((file) => path.relative(ROOT, file))).toEqual([]);
  });

  it('no client module imports the legal texts', () => {
    const offenders = SOURCE_DIRS.flatMap((dir) => {
      try {
        return collect(path.join(ROOT, dir));
      } catch {
        return [];
      }
    }).filter((file) => {
      const source = readFileSync(file, 'utf8');
      return isClientModule(source) && LEGAL_IMPORT.test(source);
    });
    expect(offenders.map((file) => path.relative(ROOT, file))).toEqual([]);
  });

  it('recognises every client module and import form it guards', () => {
    expect(isClientModule("/**\n * Doc\n */\n// note\n'use client';\n")).toBe(true);
    expect(isClientModule("import x from 'y';\n'use client';\n")).toBe(false);

    for (const line of [
      "import { getLegalDocument } from '@/content/legal';",
      "import {\n  getLegalDocument,\n} from '../../content/legal';",
      "export { getLegalDocument } from '@/content/legal';",
      "const legal = await import('@/content/legal');",
    ]) {
      expect(LEGAL_IMPORT.test(line), line).toBe(true);
    }
    expect(LEGAL_IMPORT.test("import type { LegalBlock } from '@/content/legal/types';")).toBe(
      false
    );
  });
});
