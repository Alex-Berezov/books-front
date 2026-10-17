import { decodeEntities } from './html-entities';

/** Знаки нулевой ширины: не пробел для `\s`, но и не текст. */
const INVISIBLE_CHARS = /[\u00ad\u200b-\u200d\u2060\ufeff]/g;

/**
 * Видимый текст HTML из редактора: без тегов, сущности расшифрованы, знаки нулевой ширины сняты,
 * пробелы схлопнуты. Копия правила на бэкенде - `richHtmlText` в
 * `books/src/shared/sanitize/rich-html-text.ts`: по нему бэкенд не сохраняет пересказ без
 * текста, по этому фронт отвечает 404. Разойдутся - кнопка поведёт на 404 или пустая страница уйдёт
 * в индекс.
 */
export function htmlToPlainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(INVISIBLE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Текст не длиннее `max` знаков: режется по границе слова, если она не слишком далеко, хвостовая
 * пунктуация снимается, в конце многоточие. Пустой текст - `undefined`.
 */
export function truncateAtWord(text: string, max = 160): string | undefined {
  if (!text) return undefined;
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const head = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${head.replace(/[\s,;:.—–-]+$/, '')}…`;
}
