import { getLocaleTag } from '@/lib/i18n/lang';

/**
 * Даты страницы автора (F02-3, `product.md` §4, §5). В данных дата — строка `YYYY`
 * (известен только год) или `YYYY-MM-DD`; разбор и формат — здесь, одним местом.
 */

const YEAR_ONLY = /^(\d{1,4})$/;
const FULL_DATE = /^(\d{1,4})-(\d{2})-(\d{2})$/;

/**
 * Сколько лет назад мог родиться живой автор. Старше — дата смерти, скорее всего, просто
 * неизвестна, и «род. YYYY» объявил бы живым античного автора (решение арбитра 15.10.2026,
 * `F02 | F02-3`, Р8).
 */
export const LIVING_AUTHOR_MAX_AGE = 120;

/** Год из `YYYY` или `YYYY-MM-DD`; иначе `null`. */
export function authorDateYear(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = YEAR_ONLY.exec(value) ?? FULL_DATE.exec(value);
  return match ? Number(match[1]) : null;
}

/**
 * Дата по правилам языка страницы: `YYYY` — только год, `YYYY-MM-DD` — день, месяц и год
 * (`Intl.DateTimeFormat`). Часовой пояс — UTC: иначе на западе от Гринвича полночь даты
 * уезжает на предыдущий день. Нераспознанная строка — `null`, а не выдуманная дата.
 */
export function formatAuthorDate(value: string | null | undefined, lang: string): string | null {
  if (!value) return null;
  const year = YEAR_ONLY.exec(value);
  if (year) return String(Number(year[1]));
  const full = FULL_DATE.exec(value);
  if (!full) return null;
  const [y, m, d] = [Number(full[1]), Number(full[2]), Number(full[3])];
  const date = new Date(Date.UTC(2000, m - 1, d));
  date.setUTCFullYear(y);
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return new Intl.DateTimeFormat(getLocaleTag(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Год из блоков данных (`year`): до нашей эры промпт пишет отрицательным числом (`-428`,
 * `prompts/author-data.md`) — выводится «428 до н. э.» с подписью языка страницы, а не «-428».
 */
export function formatBlockYear(year: number, bceLabel: string): string {
  return year < 0 ? `${-year} ${bceLabel}` : String(year);
}

/**
 * Годы жизни для шапки: «1828 — 1910»; без даты смерти — «род. 1947», если рождение не старше
 * `LIVING_AUTHOR_MAX_AGE` лет, иначе «1828 — ?»; известна только смерть — «? — 1910».
 * Ничего не известно — `null`, строки нет.
 */
export function formatLifeYears(
  birthDate: string | null | undefined,
  deathDate: string | null | undefined,
  bornPrefix: string,
  currentYear: number = new Date().getUTCFullYear()
): string | null {
  const born = authorDateYear(birthDate);
  const died = authorDateYear(deathDate);
  if (born !== null && died !== null) return `${born} — ${died}`;
  if (died !== null) return `? — ${died}`;
  if (born === null) return null;
  return currentYear - born <= LIVING_AUTHOR_MAX_AGE ? `${bornPrefix} ${born}` : `${born} — ?`;
}
