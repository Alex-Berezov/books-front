import { parseOrdinal } from '@/lib/utils/ordinal-param';

/** Параметр адреса читалки с номером главы: `/{lang}/book/{slug}/read?chapter=N` (F03-2). */
export const CHAPTER_PARAM = 'chapter';

/**
 * Номер главы из строки запроса: только целое ≥ 1 записью без знаков и нулей впереди. Остальное
 * (`abc`, `0`, `2.5`, `-1`, пусто) - `null`: параметр игнорируется и работает обычное
 * восстановление места (`tech.md` §1).
 */
export function parseChapterParam(search: string): number | null {
  return parseOrdinal(new URLSearchParams(search).get(CHAPTER_PARAM));
}

/** Строка запроса читалки на главе `n`: `?chapter=n`. */
export function readerChapterQuery(n: number): string {
  return `?${CHAPTER_PARAM}=${n}`;
}

/** Адрес читалки на главе `n`: `{bookHref}/read?chapter=n` - одно имя параметра на ссылку и читалку. */
export function readerChapterHref(bookHref: string, n: number): string {
  return `${bookHref}/read${readerChapterQuery(n)}`;
}

/** Строка запроса без параметра главы: глава из ссылки применяется один раз за открытие. */
export function withoutChapterParam(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(CHAPTER_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
