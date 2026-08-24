import { getAuthorLetters, getPublicAuthors } from '@/api/endpoints/public';
import type { AuthorsQuery } from './authors-href';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { AuthorLetter, AuthorListItem, PaginatedResponse } from '@/types/api-schema';

/** Размер страницы хаба. Совпадает с умолчанием бэкенда. */
export const AUTHORS_PAGE_SIZE = 24;

/**
 * Выдача авторов для хаба и для буквенной страницы.
 *
 * `hasBooks` включён здесь и только здесь. Правило `seo-rules.md` требует трёх
 * согласованных сигналов: автор без книг обязан выпасть из карты сайта, из
 * `robots` **и из внутренних ссылок**. Сетка хаба — это внутренние ссылки.
 * Фильтровать после ответа нельзя: выкинув троих из двадцати четырёх, получим
 * рваные страницы и враньё в `total` и в счётчиках букв.
 *
 * ⚠️ Главная и карта сайта зовут ту же ручку **без** `hasBooks` и фильтруют
 * сами: у `booksCount` есть история, когда он был нулём у всех авторов разом,
 * и фильтр по умолчанию опустошил бы три страницы одновременно.
 */
export function loadAuthors(
  lang: SupportedLang,
  query: AuthorsQuery
): Promise<PaginatedResponse<AuthorListItem>> {
  return getPublicAuthors(lang, {
    page: query.page,
    limit: AUTHORS_PAGE_SIZE,
    search: query.search || undefined,
    letter: query.letter || undefined,
    sort: query.sort,
    hasBooks: true,
  });
}

/**
 * Буквы указателя под текущий отбор.
 *
 * `search` передаётся, потому что указатель рисуется над отфильтрованной сеткой:
 * без него буква говорила бы «Д — 12» над выдачей из двух человек.
 */
export function loadAuthorLetters(lang: SupportedLang, search?: string): Promise<AuthorLetter[]> {
  return getAuthorLetters(lang, search);
}

/**
 * Сколько всего авторов под этот отбор — для решения о `robots` в `generateMetadata`.
 *
 * 🔴 `null` при отказе, и вызывающий обязан прочитать его как «неизвестно»,
 * а не как ноль. Тот же перекос, что в `buildRobotsByCount`: `200 + noindex`
 * поисковик исполняет и возвращает страницу неделями, а отсутствие тега
 * во время сбоя не стоит ничего. Саму страницу отказ всё равно уронит в 5xx —
 * это делает компонент, а не метаданные.
 *
 * Запрос тот же, что делает страница, поэтому Next склеивает их в один.
 */
export async function countAuthors(
  lang: SupportedLang,
  query: AuthorsQuery
): Promise<number | null> {
  try {
    const response = await loadAuthors(lang, query);
    return typeof response.meta?.total === 'number' ? response.meta.total : null;
  } catch {
    return null;
  }
}
