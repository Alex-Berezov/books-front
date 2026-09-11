/**
 * Вердикт гейта содержательности главной (`LEGACY-103`).
 *
 * Держится отдельно от CLI по той же причине, что и `scripts/lib/bundle-budget.mjs`: так спека
 * `__tests__/scripts/homepageContentGuard.test.ts` показывает на эталонном куске HTML, что
 * считается ссылкой на книгу, не поднимая сборку против отказывающего API. Иначе пробу «гейт
 * краснеет на пустой главной» нельзя ни записать, ни повторить, а значит нельзя и заметить день,
 * когда разметка ссылки изменится и счётчик уйдёт в ноль на исправном сайте.
 */

/**
 * Единственный источник языков — `lib/i18n/lang.ts`. Скрипт запускается голым `node` после
 * сборки и TypeScript-модуль импортировать не может, поэтому массив вынимается регуляркой —
 * тот же приём, что в `check-langs-sync.mjs` и `check-reserved-slugs.mjs`. Своей копии списка
 * здесь нет намеренно: она молча разошлась бы с оригиналом, и новый язык остался бы без гейта
 * (`LEGACY-168`).
 */
export const parseSupportedLangs = (text) => {
  const match = text.match(/SUPPORTED_LANGS\s*=\s*\[([^\]]*)\]/);
  if (!match) {
    throw new Error('не нашёл массив SUPPORTED_LANGS в lib/i18n/lang.ts');
  }
  const langs = match[1]
    .split(',')
    .map((part) => part.replace(/['"`]/g, '').trim())
    .filter(Boolean);
  if (langs.length === 0) {
    throw new Error('массив SUPPORTED_LANGS в lib/i18n/lang.ts пуст');
  }
  return langs;
};

/**
 * Ссылки считаются уникальными: одна книга попадает в несколько блоков главной (популярное,
 * новинки, подборки), и счёт по вхождениям выдал бы шесть за одну книгу. Ссылка на чужой язык
 * языку не засчитывается — иначе переключателя языков в подвале хватило бы, чтобы сторож
 * замолчал навсегда.
 */
export const countBookLinks = (html, lang) => {
  const matches = html.match(new RegExp(`href="/${lang}/book/[^"]+"`, 'g')) ?? [];
  return new Set(matches).size;
};

/**
 * Порог — ровно ноль, и поднимать его нельзя (решение арбитра 11.09.2026). Ссылки приходят
 * из двух списочных ручек (`getBookCards` в трёх режимах, `getCategoryBookCards` в двух)
 * и из CMS-страницы, поэтому отказ одной ручки счётчик не обнуляет: обнуляет только отказ всех.
 * Любое число больше нуля превратило бы сторожа несостоявшейся сборки в сторож объёма каталога
 * и начало бы ронять законную частичную деградацию.
 */
export const verdictOf = (pages) => {
  const missing = pages.filter((page) => !page.exists).map((page) => page.lang);
  const counted = pages.filter((page) => page.exists);
  const empty = counted.filter((page) => page.links === 0).map((page) => page.lang);

  return {
    missing,
    empty,
    counts: counted.map((page) => `${page.lang}: ${page.links}`),
    ok: missing.length === 0 && empty.length === 0,
  };
};
