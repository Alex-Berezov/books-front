import { parseOrdinal } from '@/lib/utils/ordinal-param';

/** Параметр адреса читалки с номером главы: `/{lang}/book/{slug}/read?chapter=N` (F03-2). */
export const CHAPTER_PARAM = 'chapter';

/**
 * Параметр абзаца главы: `?chapter=N&p=K` - «Читать сцену» мира книги (`F08-10a`). Номер K - по
 * правилу абзаца бэкенда (`components/common/ReaderView/readerParagraphs.ts`); без `chapter`
 * не действует, неверный - начало главы (решение арбитра `F08 | F08-10` Q2).
 */
export const PARAGRAPH_PARAM = 'p';

/**
 * Номер главы из строки запроса: только целое ≥ 1 записью без знаков и нулей впереди. Остальное
 * (`abc`, `0`, `2.5`, `-1`, пусто) - `null`: параметр игнорируется и работает обычное
 * восстановление места (`tech.md` §1).
 */
export function parseChapterParam(search: string): number | null {
  return parseOrdinal(new URLSearchParams(search).get(CHAPTER_PARAM));
}

/** Номер абзаца из строки запроса: то же правило числа, что у главы; иначе `null`. */
export function parseParagraphParam(search: string): number | null {
  return parseOrdinal(new URLSearchParams(search).get(PARAGRAPH_PARAM));
}

/**
 * Номер главы из `searchParams` серверной страницы (читалка и плеер): то же правило, что
 * у `parseChapterParam`; параметр повторён (`?chapter=1&chapter=2`) - `null`.
 */
export function chapterFromSearchParams(
  search: Record<string, string | string[] | undefined>
): number | null {
  const raw = search[CHAPTER_PARAM];
  return typeof raw === 'string' ? parseOrdinal(raw) : null;
}

/**
 * Номер абзаца из `searchParams` серверной страницы читалки: то же правило, что у главы
 * (`F08-10a`); повтор параметра - `null`.
 */
export function paragraphFromSearchParams(
  search: Record<string, string | string[] | undefined>
): number | null {
  const raw = search[PARAGRAPH_PARAM];
  return typeof raw === 'string' ? parseOrdinal(raw) : null;
}

/**
 * Строка запроса читалки на главе `n`: `?chapter=n`; с абзацем `p` - `?chapter=n&p=p` (`F08-10a`).
 * Одна сборка на ссылку сцены и на перенос места при смене слага (решение `F03 | F03-3` В2).
 */
export function readerChapterQuery(n: number, p: number | null = null): string {
  const chapter = `?${CHAPTER_PARAM}=${n}`;
  return p === null ? chapter : `${chapter}&${PARAGRAPH_PARAM}=${p}`;
}

/** Адрес читалки на главе `n`: `{bookHref}/read?chapter=n` - одно имя параметра на ссылку и читалку. */
export function readerChapterHref(bookHref: string, n: number): string {
  return `${bookHref}/read${readerChapterQuery(n)}`;
}

/**
 * Адрес читалки на абзаце `p` главы `n` (сцена мира книги, `F08-10a`): `?chapter=n&p=p`; абзаца нет
 * (`null`) - адрес главы.
 */
export function readerSceneHref(bookHref: string, n: number, p: number | null): string {
  return `${bookHref}/read${readerChapterQuery(n, p)}`;
}

/**
 * Адрес плеера на аудиоглаве `n`: `{bookHref}/listen?chapter=n` - то же имя параметра, что у читалки
 * («Слушать» у сцены мира книги, решение арбитра `F08 | F08-3` Q6).
 */
export function listenChapterHref(bookHref: string, n: number): string {
  return `${bookHref}/listen${readerChapterQuery(n)}`;
}

/**
 * Строка запроса без параметра главы и абзаца: глава из ссылки применяется один раз за открытие,
 * абзац без главы смысла не имеет (плеер его не читает и снимает вместе с главой).
 */
export function withoutChapterParam(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(CHAPTER_PARAM);
  params.delete(PARAGRAPH_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
