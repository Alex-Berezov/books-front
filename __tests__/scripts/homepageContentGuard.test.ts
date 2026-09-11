// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { countBookLinks, parseSupportedLangs, verdictOf } from '@/scripts/lib/homepage-content.mjs';

/**
 * 🔴 LEGACY-103. При API, отвечающем отказом на все запросы главной, `next build` выходил
 * с кодом 0 и запекал языковые главные без единой ссылки на книгу: 26 КБ вместо 250, обычный
 * `<title>`, без `noindex`. Ни одна проверка в наполнение не смотрела, поэтому образ с пустыми
 * главными проходил `yarn ci`, health-check и выкат.
 *
 * Спека держит два уровня. Вердикт (`scripts/lib/homepage-content.mjs`) гоняется напрямую
 * на эталонных кусках HTML: так видно, что именно считается ссылкой на книгу, и правка
 * регулярки или порога краснеет здесь, а не на выкате. Сам скрипт проверяется в песочнице
 * целиком — чтобы не разошлись коды возврата и тексты отказов, ради которых он и написан.
 */

const REPO_ROOT = resolve(__dirname, '../..');
const LANGS = ['en', 'es', 'fr', 'pt', 'ru'];

let sandbox: string;

/** Оба потока: отказ печатается в `stderr`, успех — в `stdout`. */
const run = (): { status: number; output: string } => {
  const result = spawnSync(
    process.execPath,
    [join(sandbox, 'scripts', 'homepage-content-guard.mjs')],
    { cwd: sandbox, encoding: 'utf8' }
  );

  return { status: result.status ?? -1, output: `${result.stdout}${result.stderr}` };
};

/** Главная с несколькими книгами — то, как выглядит нормальная сборка. */
const pageWithBooks = (lang: string, count: number): string => {
  const links = Array.from(
    { length: count },
    (_, at) => `<a href="/${lang}/book/book-${at}">Book ${at}</a>`
  ).join('');
  return `<!DOCTYPE html><html><body><h1>Bibliaris</h1>${links}</body></html>`;
};

const writePage = (lang: string, html: string): void => {
  writeFileSync(join(sandbox, '.next', 'server', 'app', `${lang}.html`), html, 'utf8');
};

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'bibliaris-homepage-guard-'));
  mkdirSync(join(sandbox, 'scripts', 'lib'), { recursive: true });
  mkdirSync(join(sandbox, '.next', 'server', 'app'), { recursive: true });
  mkdirSync(join(sandbox, 'lib', 'i18n'), { recursive: true });
  cpSync(
    join(REPO_ROOT, 'scripts', 'homepage-content-guard.mjs'),
    join(sandbox, 'scripts', 'homepage-content-guard.mjs')
  );
  cpSync(
    join(REPO_ROOT, 'scripts', 'lib', 'homepage-content.mjs'),
    join(sandbox, 'scripts', 'lib', 'homepage-content.mjs')
  );
  // Настоящий источник языков копируется, а не переписывается: копия списка в тесте
  // краснела бы на добавлении языка, то есть не про то, ради чего тест написан.
  cpSync(join(REPO_ROOT, 'lib', 'i18n', 'lang.ts'), join(sandbox, 'lib', 'i18n', 'lang.ts'));
  for (const lang of LANGS) writePage(lang, pageWithBooks(lang, 6));
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('вердикт гейта: что считается ссылкой на книгу', () => {
  it('считает уникальные книги, а не вхождения ссылок', () => {
    const repeated = Array.from({ length: 5 }, () => '<a href="/pt/book/same">Same</a>').join('');

    expect(countBookLinks(repeated, 'pt')).toBe(1);
  });

  it('не засчитывает языку ссылки на книги другого языка', () => {
    const html = '<a href="/en/book/x">X</a><a href="/en/book/y">Y</a>';

    expect(countBookLinks(html, 'fr')).toBe(0);
    expect(countBookLinks(html, 'en')).toBe(2);
  });

  /**
   * Полезная нагрузка RSC внизу файла несёт те же адреса, но с экранированными кавычками
   * (`\"href\":\"/en/book/...\"`). Засчитывать её нельзя: тогда счётчик остался бы ненулевым
   * на странице, где видимой разметки нет вовсе, — то есть ровно на дефекте записи.
   */
  it('не засчитывает адреса из экранированной полезной нагрузки RSC', () => {
    const rsc = 'self.__next_f.push([1,"{\\"href\\":\\"/en/book/hidden\\"}"])';

    expect(countBookLinks(rsc, 'en')).toBe(0);
  });

  it('пустой язык виден в вердикте, непустой — нет', () => {
    const verdict = verdictOf([
      { lang: 'en', exists: true, links: 3 },
      { lang: 'fr', exists: true, links: 0 },
    ]);

    expect(verdict.empty).toEqual(['fr']);
    expect(verdict.ok).toBe(false);
  });

  /**
   * Порог — ровно ноль, и это требование решения арбитра, а не недосмотр: отказ одной ручки —
   * законная деградация. Сторож, роняющий сборку на единственной оставшейся книге, отличал бы
   * объём каталога, а не несостоявшуюся сборку.
   */
  it('пропускает частичную деградацию: одна ссылка — уже не пустая страница', () => {
    const verdict = verdictOf([{ lang: 'es', exists: true, links: 1 }]);

    expect(verdict.ok).toBe(true);
  });

  it('отсутствие артефакта — отдельный исход, а не ноль ссылок', () => {
    const verdict = verdictOf([
      { lang: 'en', exists: true, links: 3 },
      { lang: 'ru', exists: false },
    ]);

    expect(verdict.missing).toEqual(['ru']);
    expect(verdict.empty).toEqual([]);
    expect(verdict.ok).toBe(false);
  });

  it('список языков берётся из lib/i18n/lang.ts, а не из копии', () => {
    const text = "export const SUPPORTED_LANGS = ['en', 'es', 'de'] as const;";

    expect(parseSupportedLangs(text)).toEqual(['en', 'es', 'de']);
  });

  it('нечитаемый список языков — отказ, а не пустой набор', () => {
    expect(() => parseSupportedLangs('export const NOTHING = 1;')).toThrow(/SUPPORTED_LANGS/);
  });
});

describe('homepage-content-guard.mjs целиком', () => {
  it('молчит, когда ссылки на книги есть у всех языков', () => {
    const { status, output } = run();

    expect(status).toBe(0);
    expect(output).toContain('en: 6');
    expect(output).toContain('ru: 6');
  });

  it('краснеет и называет язык, если главная запеклась без единой ссылки на книгу', () => {
    writePage('fr', '<!DOCTYPE html><html><body><h1>Bibliaris</h1></body></html>');

    const { status, output } = run();

    expect(status).toBe(1);
    expect(output).toContain('без единой ссылки на книгу: fr');
    expect(output).toContain('.next');
  });

  it('краснеет, если запечённой главной нет вовсе', () => {
    rmSync(join(sandbox, '.next', 'server', 'app', 'ru.html'));

    const { status, output } = run();

    expect(status).toBe(1);
    expect(output).toContain('нет запечённых главных: ru.html');
  });

  /**
   * Язык, добавленный в `lib/i18n/lang.ts`, попадает под проверку сам — копии списка,
   * которую забыли бы дописать, здесь нет.
   */
  it('берёт языки из lang.ts: новый язык без артефакта краснеет', () => {
    const langFile = join(sandbox, 'lib', 'i18n', 'lang.ts');
    const text = readFileSync(langFile, 'utf8').replace("'ru'", "'ru', 'de'");
    writeFileSync(langFile, text, 'utf8');

    const { status, output } = run();

    expect(status).toBe(1);
    expect(output).toContain('de.html');
  });
});
