import type { SupportedLang } from '@/lib/i18n/lang';

/** Разбор адреса хаба: что пришло в пути и в строке запроса. */
export interface AuthorsQuery {
  page: number;
  search: string;
  sort: 'name' | 'books';
  /** Буква из пути буквенной страницы; на хабе — `null`. */
  letter: string | null;
}

/**
 * Кодирование буквы для адреса — в нижнем регистре целиком, включая саму
 * процентную последовательность.
 *
 * 🔴 `encodeURIComponent('д')` даёт `%D0%B4` — с **заглавными** шестнадцатеричными
 * парами. А `middleware.ts` редиректит любой путь, в котором есть `[A-Z]`
 * (правило «адрес в нижнем регистре»), и `request.nextUrl.pathname` процентные
 * последовательности не декодирует: буквы `D` и `B` внутри `%D0%B4` считаются
 * заглавными. Результат — постоянный 301 на каждом из двадцати девяти русских
 * буквенных адресов, причём страница по `%d0%b4` объявляла canonical обратно
 * на `%D0%B4`, то есть canonical указывал на редирект. В индекс такие страницы
 * не попадают вовсе — а отдельный файл карты сайта заведён именно ради них.
 *
 * Регистр кодировки семантики не меняет: `%d0%b4` и `%D0%B4` декодируются в одну
 * и ту же букву (RFC 3986 §6.2.2.1). Поэтому чинится это здесь, а не правкой
 * middleware: одна функция вместо правила, действующего на весь сайт.
 *
 * ⚠️ Единственное место, где собирается адрес буквенной страницы. Указатель,
 * canonical, hreflang и карта сайта обязаны звать именно её: разъедься они —
 * `/ru/authors/letter/Д`, `/ru/authors/letter/д` и `/ru/authors/letter/%D0%B4`
 * стали бы тремя адресами одной страницы.
 */
function encodeLetter(letter: string): string {
  return encodeURIComponent(letter.toLowerCase()).toLowerCase();
}

/** Базовый путь: хаб либо буквенная страница. */
export function authorsBasePath(lang: SupportedLang, letter: string | null): string {
  if (!letter) return `/${lang}/authors`;
  return `/${lang}/authors/letter/${encodeLetter(letter)}`;
}

/**
 * Адрес страницы выдачи: путь плюс сохранённые поиск, сортировка и номер.
 *
 * Умолчания в адрес не пишутся. `?sort=name` и `?page=1` — это тот же самый
 * набор авторов по другому адресу, то есть дубль страницы для поисковика.
 */
export function authorsHref(
  lang: SupportedLang,
  { page, search, sort, letter }: AuthorsQuery
): string {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (sort !== 'name') params.set('sort', sort);
  if (page > 1) params.set('page', String(page));

  const query = params.toString();
  const base = authorsBasePath(lang, letter);
  return query ? `${base}?${query}` : base;
}

/**
 * Длина строки поиска. Ровно `@MaxLength(100)` из `PublicAuthorsQueryDto`.
 *
 * 🔴 Не «на всякий случай»: страница списка намеренно не ловит ошибку запроса,
 * потому что список и есть страница. Уйди в бэкенд сто первый знак — придёт 400,
 * `httpGet` бросит `ApiError`, и вместо «Никого не нашли» читатель получит 500.
 * Обрезаем здесь и ставим `maxLength` на само поле ввода.
 */
export const AUTHORS_SEARCH_MAX_LENGTH = 100;

/**
 * Потолок номера страницы.
 *
 * 🔴 `?page=99999999999999999999` проходит и `Number.isFinite`, и `@IsInt`
 * на бэкенде, уходит в `OFFSET page * 24` и роняет запрос уже на стороне базы —
 * то есть 500 по адресу, который выдумает любой обходчик. Настоящих страниц
 * столько не бывает: даже при десяти тысячах авторов их четыреста с небольшим.
 */
export const AUTHORS_MAX_PAGE = 10_000;

/** Читает `searchParams` страницы, приводя мусор к умолчаниям. */
export function parseAuthorsQuery(
  searchParams: Record<string, string | string[] | undefined>,
  letter: string | null
): AuthorsQuery {
  const single = (value: string | string[] | undefined): string =>
    (Array.isArray(value) ? value[0] : value) ?? '';

  const rawPage = Number.parseInt(single(searchParams.page), 10);
  const rawSort = single(searchParams.sort);

  const page = Number.isFinite(rawPage) && rawPage > 1 ? Math.min(rawPage, AUTHORS_MAX_PAGE) : 1;

  return {
    page,
    search: single(searchParams.search).trim().slice(0, AUTHORS_SEARCH_MAX_LENGTH),
    sort: rawSort === 'books' ? 'books' : 'name',
    letter,
  };
}
