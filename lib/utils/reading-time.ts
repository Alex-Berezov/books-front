/**
 * Время чтения пересказа - одно правило на страницу `/summary` и вкладку админки (F04). Модуль без
 * зависимостей: вкладка не тянет в бандл админки санитайзер и hreflang из `lib/seo/book-summary.ts`.
 */

/** Скорость чтения для оценки «N мин» - средняя для взрослого читателя прозы. */
const WORDS_PER_MINUTE = 230;

/** Минуты чтения пересказа, не меньше одной; пустой текст - `0`. */
export function readingMinutes(plainText: string): number {
  const words = plainText ? plainText.split(' ').filter(Boolean).length : 0;
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
