// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COOKIE_INVENTORY } from '@/lib/consent/cookie-inventory';

/**
 * Сторож перечня cookie (`F01-2`, `tech.md` §4.5). Таблица на `/cookies` строится из
 * `COOKIE_INVENTORY`; запись в хранилище, которой в перечне нет, - это cookie, о которой
 * посетителю не сказано. Тест краснеет на ней.
 */

const ROOT = path.resolve(__dirname, '../../..');
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '__tests__',
  'e2e',
  '.git',
  'coverage',
  '.yarn-cache',
  '.claude',
]);
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

/** Файлы, которым разрешено писать в хранилище, и имена, которыми они пишут. */
const KNOWN_WRITERS: Record<string, string[]> = {
  'components/public/navigation/InternalNavigationTracker.tsx': [
    'bibliaris.currentPath',
    'bibliaris.previousPath',
  ],
  'lib/auth/sessionMarker.ts': ['logged_in'],
  'lib/reading-progress/localProgress.ts': ['bibliaris.reading-progress.v1'],
  'lib/consent/consent-storage.ts': ['bibliaris.consent-region.v1'],
  'lib/consent/ga-cookies.ts': ['_ga', '_ga_<ID>'],
};

/** Литералы вида `bibliaris.*`, которые не ключи хранилища, а домен. */
const NOT_STORAGE_KEYS = new Set(['bibliaris.com']);

const WRITE = /\.setItem\(|document\.cookie\s*=(?!=)/;
const STORAGE_KEY_LITERAL = /['"`](bibliaris\.[A-Za-z][A-Za-z0-9.-]*)['"`]/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const sources = walk(ROOT).map((file) => ({
  rel: path.relative(ROOT, file).split(path.sep).join('/'),
  text: fs.readFileSync(file, 'utf8'),
}));
const inventoryNames = new Set(COOKIE_INVENTORY.map((entry) => entry.name));

describe('перечень cookie', () => {
  it('имена в перечне уникальны', () => {
    expect(inventoryNames.size).toBe(COOKIE_INVENTORY.length);
  });

  it('любая запись в хранилище или document.cookie - в известном месте', () => {
    const unknown = sources
      .filter(({ rel, text }) => WRITE.test(text) && !(rel in KNOWN_WRITERS))
      .map(({ rel }) => rel);
    expect(unknown).toEqual([]);
  });

  it('у известного места все имена есть в перечне и в самом файле, и файл всё ещё пишет', () => {
    for (const [rel, names] of Object.entries(KNOWN_WRITERS)) {
      const source = sources.find((candidate) => candidate.rel === rel);
      expect(source, `${rel} исчез - уберите его из KNOWN_WRITERS`).toBeDefined();
      expect(WRITE.test(source!.text), `${rel} больше не пишет`).toBe(true);
      for (const name of names) {
        expect(inventoryNames.has(name), `${name} нет в перечне`).toBe(true);
        // Имя в перечне записано строкой (источник - клиентский модуль); переименование
        // ключа в источнике без правки перечня краснеет здесь.
        const literal = `'${name.replace('<ID>', '')}'`;
        expect(source!.text.includes(literal), `${rel} не пишет ${name}`).toBe(true);
      }
    }
  });

  it('любой литерал bibliaris.*, похожий на ключ хранилища, есть в перечне', () => {
    const missing: string[] = [];
    for (const { rel, text } of sources) {
      for (const match of text.matchAll(STORAGE_KEY_LITERAL)) {
        if (!NOT_STORAGE_KEYS.has(match[1]) && !inventoryNames.has(match[1]))
          missing.push(`${rel}: ${match[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('правило поиска ловит запись через псевдоним хранилища и присваивание cookie', () => {
    expect(WRITE.test("const s = window.localStorage; s.setItem('x', '1')")).toBe(true);
    expect(WRITE.test('document.cookie = "a=b"')).toBe(true);
    expect(WRITE.test('if (document.cookie === "")')).toBe(false);
  });
});
