#!/usr/bin/env node
/**
 * Гейт содержательности главной страницы (`LEGACY-103`, пачка `M8`,
 * решение арбитра 11.09.2026).
 *
 * `books-front/app/[lang]/page.tsx` собирает главную из девяти запросов, и каждый обёрнут
 * в `.catch`. Это осознанный выбор: отказ одного источника не должен рисовать пустой блок
 * во всю страницу. Но у выбора не было порога — при API, отвечающем 401 на всё, `next build`
 * выходил с кодом 0 и запекал главные размером 26 КБ вместо 250 КБ: без единой ссылки
 * на книгу, без `noindex`, с обычным `<title>`. Такой образ проходил все проверки, а отрава
 * жила пять минут (`revalidate = 300`) ровно в момент выката.
 *
 * Отличить пустую страницу от нормальной по коду ответа нельзя — они различаются только
 * наполнением. Поэтому проверка смотрит в наполнение: сколько уникальных ссылок на книги
 * попало в запечённый HTML каждого языка.
 *
 * Почему ноль означает отказ запросов, а не пустую базу: оба пути сборки идут по непустым
 * данным. В `ci.yml` сид и проверка сида стоят до `yarn build`, а боевой образ собирается
 * против рабочего API (`Dockerfile`). Запечённая главная без единой книги нешиппабельна
 * в любом случае.
 *
 * Дверей для зелёного здесь нет намеренно: ни `--update`, ни снимка, ни переменной окружения.
 * Проверка, которую можно отключить флагом, в день отказа будет отключена.
 *
 * Вердикт живёт в `scripts/lib/homepage-content.mjs`, чтобы спека гоняла его на эталонных
 * кусках HTML, а не поднимала сборку против отказывающего API.
 *
 * Запуск: `yarn build` (вторым звеном, сразу после `next build`).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { countBookLinks, parseSupportedLangs, verdictOf } from './lib/homepage-content.mjs';

const ROOT = process.cwd();
const APP_DIR = join(ROOT, '.next', 'server', 'app');
const LANG_FILE = join(ROOT, 'lib', 'i18n', 'lang.ts');

const die = (lines) => {
  for (const line of lines) console.error(line);
  process.exit(1);
};

let langs;
try {
  langs = parseSupportedLangs(readFileSync(LANG_FILE, 'utf8'));
} catch (error) {
  die([
    `homepage-content-guard: не читается список языков: ${error.message}`,
    `Файл: ${LANG_FILE}.`,
    'Список берётся оттуда, а не копией здесь: копия разошлась бы молча, и новый язык',
    'остался бы без проверки — то есть его главная могла бы запечься пустой.',
  ]);
}

const pages = langs.map((lang) => {
  const file = join(APP_DIR, `${lang}.html`);
  if (!existsSync(file)) return { lang, exists: false, file };
  const html = readFileSync(file, 'utf8');
  return { lang, exists: true, file, links: countBookLinks(html, lang), bytes: html.length };
});

const verdict = verdictOf(pages);

if (verdict.missing.length > 0) {
  die([
    `homepage-content-guard: нет запечённых главных: ${verdict.missing.map((lang) => `${lang}.html`).join(', ')}.`,
    `Искали в ${APP_DIR}.`,
    'Отсутствие артефакта — это не «нечего проверять», а несостоявшаяся сборка страницы:',
    'пропустить её означало бы выпустить образ, про который проверка ничего не знает.',
    'Сначала сборка, потом проверка: `yarn build` делает это одной командой.',
  ]);
}

if (verdict.empty.length > 0) {
  const details = pages
    .filter((page) => page.exists)
    .map((page) => `  ${page.lang}: ${page.links} ссылок, ${Math.round(page.bytes / 1024)} КБ, ${page.file}`);

  die([
    `homepage-content-guard: главная запеклась без единой ссылки на книгу: ${verdict.empty.join(', ')}.`,
    ...details,
    '',
    'Это не пустой каталог, а отказ всех запросов главной: страница собирается из двух списочных',
    'ручек (`getBookCards` в трёх режимах, `getCategoryBookCards` в двух) и CMS-страницы,',
    'и каждый вызов обёрнут в `.catch` (app/[lang]/page.tsx). Отказ одной ручки ссылки',
    'не обнуляет — обнуляет только отказ всех сразу, то есть недоступный или отвечающий',
    'отказом API на момент сборки.',
    '',
    'Что проверить: доступность API по NEXT_PUBLIC_API_BASE_URL, не закрыт ли гвардом один',
    'из публичных маршрутов главной, есть ли в базе опубликованные версии книг.',
  ]);
}

console.log(
  `homepage-content-guard: ссылки на книги есть у всех языков (${verdict.counts.join(', ')}).`
);
