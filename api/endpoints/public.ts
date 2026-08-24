/**
 * Public API endpoints
 *
 * Contains typed functions for working with public data:
 * books, pages, categories, tags, etc.
 */

import { httpGet, buildLangPath } from '@/lib/http';
import { httpGetAuth } from '@/lib/http-client';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { SystemPageKey } from '@/lib/system-pages';
import type {
  AuthorLetter,
  AuthorListItem,
  BookCardsResponse,
  BookOverview,
  CategoryBookCardsResponse,
  CategoryBooksResponse,
  CategoryTree,
  PageResponse,
  TagBookCardsResponse,
  TagBooksResponse,
  SeoResolveResponse,
  ChapterDetail,
  PaginatedResponse,
  PublicAuthorDetail,
  RelatedBooksResponse,
} from '@/types/api-schema';

/**
 * Get public chapters list for a book version
 *
 * @param versionId - Book version ID
 * @returns Array of chapters
 */
export const getPublicChapters = async (versionId: string): Promise<ChapterDetail[]> => {
  const endpoint = `/versions/${versionId}/chapters`;
  return httpGet<ChapterDetail[]>(endpoint);
};

/**
 * Get book overview
 *
 * @param lang - Language
 * @param slug - Book slug
 * @returns Book overview
 *
 * @example
 * ```ts
 * const book = await getBookOverview('en', 'lord-of-the-rings');
 * ```
 */
export const getBookOverview = async (lang: SupportedLang, slug: string): Promise<BookOverview> => {
  const endpoint = buildLangPath(lang, `/books/${slug}/overview`);
  return httpGet<BookOverview>(endpoint, { language: lang, next: { revalidate: 300 } });
};

/**
 * Get related books (compact BookCard) for a book page: same-author + similar-by-category.
 *
 * Returns only the fields required by the BookCard component (no versions/translations/JSON content).
 * `limit` is the maximum total number of unique cards across both blocks (default 8, max 16).
 */
export const getRelatedBooks = async (
  lang: SupportedLang,
  slug: string,
  limit = 8
): Promise<RelatedBooksResponse> => {
  const endpoint = buildLangPath(lang, `/books/${slug}/related?limit=${limit}`);
  return httpGet<RelatedBooksResponse>(endpoint, { language: lang, next: { revalidate: 300 } });
};

export interface BookCardsQueryOptions {
  sort?: 'popular' | 'new';
  type?: 'audio' | 'text';
  q?: string;
}

/**
 * Get compact paginated book cards for a language (homepage / catalog).
 *
 * Replaces the legacy `getPublicBooks({ limit: 100 })` over-fetch (11.9 MB).
 * Server-side max limit = 48. Returns BookCardModel[] (no versions/translations/JSON content).
 * Supports optional sort, type, and q (search) filters.
 */
export const getBookCards = async (
  lang: SupportedLang,
  page = 1,
  limit = 24,
  options?: BookCardsQueryOptions
): Promise<BookCardsResponse> => {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (options?.sort) params.append('sort', options.sort);
  if (options?.type) params.append('type', options.type);
  if (options?.q) params.append('q', options.q);
  const endpoint = buildLangPath(lang, `/books/cards?${params.toString()}`);
  return httpGet<BookCardsResponse>(endpoint, { language: lang, next: { revalidate: 300 } });
};

/**
 * Get compact paginated book cards for an author (author page fallback).
 *
 * Filters by stable `authorId` (resolved from author slug on the backend), NOT by display name.
 */
export const getAuthorBookCards = async (
  lang: SupportedLang,
  authorSlug: string,
  page = 1,
  limit = 24
): Promise<BookCardsResponse> => {
  const endpoint = buildLangPath(
    lang,
    `/authors/${authorSlug}/books/cards?page=${page}&limit=${limit}`
  );
  return httpGet<BookCardsResponse>(endpoint, { language: lang });
};

export interface ReaderBootstrapResponse {
  bookId: string;
  versionId: string;
  slug: string;
  title: string;
  author: string;
  chapters: ChapterDetail[];
  lastProgress: {
    chapterNumber: number | null;
    position: number;
  } | null;
}

/**
 * Get Reader bootstrap data in a single request.
 *
 * 🔴 The reader must not be named by a parameter. Until 10.08.2026 this call
 * carried `?userId=<id from the session>` — and the browser is exactly where
 * such a parameter is trivially swapped: substituting someone else's id
 * returned their reading progress to an anonymous caller (`LEGACY-088`). The
 * reader now arrives only as a token, and the server takes them from there.
 */
export const getReaderBootstrap = async (
  lang: SupportedLang,
  slug: string
): Promise<ReaderBootstrapResponse> => {
  const endpoint = buildLangPath(lang, `/books/${slug}/reader-bootstrap`);
  return httpGetAuth<ReaderBootstrapResponse>(endpoint, { language: lang, optionalAuth: true });
};

/**
 * Get public list of all books with pagination (without auth requirement)
 */
export const getPublicBooks = async (
  lang: SupportedLang,
  params: { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<BookOverview>> => {
  const { page = 1, limit = 20 } = params;
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const endpoint = buildLangPath(lang, `/books?${queryParams.toString()}`);
  return httpGet<PaginatedResponse<BookOverview>>(endpoint, { language: lang });
};

/**
 * Get CMS page
 *
 * @param lang - Language
 * @param slug - Page slug
 * @returns Page data
 *
 * @example
 * ```ts
 * const page = await getPage('en', 'about-us');
 * ```
 */
export const getPage = async (lang: SupportedLang, slug: string): Promise<PageResponse> => {
  const endpoint = buildLangPath(lang, `/pages/${slug}`);
  return httpGet<PageResponse>(endpoint, { language: lang });
};

/**
 * Get a page the site looks up for itself, by its immutable key
 *
 * Главная и четыре хаба таксономий адресуются ключом, а не слагом: слаг админка
 * генерирует из заголовка, и переименование заголовка раньше рвало связь молча —
 * страница отвечала 200, но уже без своих meta, H1, SEO-текста и FAQ.
 *
 * @example
 * ```ts
 * const page = await getPageBySystemKey('en', 'homepage');
 * ```
 */
export const getPageBySystemKey = async (
  lang: SupportedLang,
  systemKey: SystemPageKey
): Promise<PageResponse> => {
  const endpoint = buildLangPath(lang, `/pages/by-key/${systemKey}`);
  return httpGet<PageResponse>(endpoint, { language: lang });
};

/**
 * Get category books
 *
 * @param lang - Language
 * @param slug - Category slug
 * @param page - Page number (optional)
 * @param limit - Items per page (optional)
 * @returns Category books with pagination
 *
 * @example
 * ```ts
 * const result = await getCategoryBooks('en', 'fiction', 1, 20);
 * ```
 */
export const getCategoryBooks = async (
  lang: SupportedLang,
  slug: string,
  page?: number,
  limit?: number
): Promise<CategoryBooksResponse> => {
  const params = new URLSearchParams();
  if (page !== undefined) params.append('page', String(page));
  if (limit !== undefined) params.append('limit', String(limit));

  const queryString = params.toString();
  const endpoint = buildLangPath(
    lang,
    `/categories/${slug}/books${queryString ? `?${queryString}` : ''}`
  );

  return httpGet<CategoryBooksResponse>(endpoint, { language: lang });
};

/**
 * Get books by tag
 *
 * @param lang - Language
 * @param slug - Tag slug
 * @param page - Page number (optional)
 * @param limit - Items per page (optional)
 * @returns Books by tag with pagination
 *
 * @example
 * ```ts
 * const result = await getTagBooks('en', 'fantasy', 1, 20);
 * ```
 */
export const getTagBooks = async (
  lang: SupportedLang,
  slug: string,
  page?: number,
  limit?: number
): Promise<TagBooksResponse> => {
  const params = new URLSearchParams();
  if (page !== undefined) params.append('page', String(page));
  if (limit !== undefined) params.append('limit', String(limit));

  const queryString = params.toString();
  const endpoint = buildLangPath(
    lang,
    `/tags/${slug}/books${queryString ? `?${queryString}` : ''}`
  );

  return httpGet<TagBooksResponse>(endpoint, { language: lang });
};

/**
 * Get compact paginated book cards for a category (or genre/collection).
 *
 * Uses new compact endpoint that returns BookCardDto[] instead of full BookOverview[].
 * Server-side max limit = 48.
 */
export const getCategoryBookCards = async (
  lang: SupportedLang,
  slug: string,
  page = 1,
  limit = 24
): Promise<CategoryBookCardsResponse> => {
  const endpoint = buildLangPath(
    lang,
    `/categories/${slug}/books/cards?page=${page}&limit=${limit}`
  );
  return httpGet<CategoryBookCardsResponse>(endpoint, { language: lang });
};

export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  booksCount: number;
  translations: Array<{ language: string; name: string; slug: string }>;
}

export interface PaginatedCategoriesResponse {
  data: CategoryListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TagListItem {
  id: string;
  name: string;
  slug: string;
  booksCount: number;
  /** Cached per-language book count for the requested `?lang` (undefined without it) */
  langBookCount?: number;
  /**
   * Automatic indexability (hysteresis) for the requested `?lang`; undefined without it
   * or when the tag has no translation into that language. Decide linkability with
   * `isTaxonomyLinkable`, never with `booksCount` directly.
   */
  autoIndexable?: boolean;
  /** Editorial switch: tag excluded from indexing */
  indexable?: boolean;
  /** Editorial switch: tag hidden from public lists */
  isVisible?: boolean;
  translations: Array<{
    language: string;
    name: string;
    slug: string;
    bookCount?: number;
    autoIndexable?: boolean;
  }>;
}

export interface PaginatedTagsResponse {
  data: TagListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Get public category/genre/collection listing for catalog sidebar / homepage.
 */
export const getPublicCategories = async (
  lang: SupportedLang,
  type?: 'category' | 'genre' | 'collection'
): Promise<PaginatedCategoriesResponse> => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  const endpoint = buildLangPath(lang, `/categories?${params.toString()}`);
  return httpGet<PaginatedCategoriesResponse>(endpoint, { language: lang });
};

/**
 * Get compact paginated book cards for a tag.
 *
 * Uses new compact endpoint that returns BookCardDto[] instead of full BookOverview[].
 * Server-side max limit = 48.
 */
export const getTagBookCards = async (
  lang: SupportedLang,
  slug: string,
  page = 1,
  limit = 24
): Promise<TagBookCardsResponse> => {
  const endpoint = buildLangPath(lang, `/tags/${slug}/books/cards?page=${page}&limit=${limit}`);
  return httpGet<TagBookCardsResponse>(endpoint, { language: lang });
};

/**
 * Category/genre/collection tree with children, for server rendering.
 *
 * The overview pages used to fetch this from the browser, which meant their
 * server HTML contained no links to any term — every taxonomy page in the
 * sitemap was reachable only by executing JavaScript (rule 7.6). `/categories/tree`
 * is not language-prefixed; it takes `?lang=`.
 */
export const getPublicCategoriesTree = async (
  lang: SupportedLang,
  type?: 'category' | 'genre' | 'collection'
): Promise<CategoryTree[]> => {
  const params = new URLSearchParams({ lang });
  if (type) params.append('type', type);
  return httpGet<CategoryTree[]>(`/categories/tree?${params.toString()}`, {
    language: lang,
    next: { revalidate: 300 },
  });
};

/**
 * Get public tags listing for homepage.
 */
export const getPublicTags = async (
  lang: SupportedLang,
  params: { page?: number; limit?: number } = {}
): Promise<PaginatedTagsResponse> => {
  const { page = 1, limit = 50 } = params;
  const queryParams = new URLSearchParams({ page: String(page), limit: String(limit) });
  const endpoint = buildLangPath(lang, `/tags?${queryParams.toString()}`);
  return httpGet<PaginatedTagsResponse>(endpoint, { language: lang });
};

/**
 * Get SEO data for entity
 *
 * @param lang - Language
 * @param type - Entity type (book, page, category, tag)
 * @param id - Entity ID
 * @returns SEO data
 *
 * @example
 * ```ts
 * const seo = await resolveSeo('en', 'book', 'uuid-here');
 * ```
 */
export const resolveSeo = async (
  lang: SupportedLang,
  type: 'book' | 'page' | 'category' | 'tag' | 'catalog' | 'genre' | 'collection',
  id: string
): Promise<SeoResolveResponse> => {
  const endpoint = buildLangPath(lang, `/seo/resolve`);
  const params = new URLSearchParams({ type, id });

  return httpGet<SeoResolveResponse>(`${endpoint}?${params.toString()}`, {
    language: lang,
    next: { revalidate: 300 },
  });
};

/**
 * Get public author detail by slug
 */
export const getPublicAuthorBySlug = async (
  lang: SupportedLang,
  slug: string
): Promise<PublicAuthorDetail> => {
  const endpoint = buildLangPath(lang, `/authors/${slug}`);
  return httpGet<PublicAuthorDetail>(endpoint, { language: lang });
};

/** Параметры публичного списка авторов. Совпадают с `PublicAuthorsQueryDto` на бэкенде. */
export type PublicAuthorsParams = {
  page?: number;
  limit?: number;
  /** Подстрока имени на языке пути, регистр не важен. */
  search?: string;
  /** Одна буква алфавита языка страницы либо `#`. */
  letter?: string;
  sort?: 'name' | 'books';
  /**
   * Отбросить авторов без опубликованных книг.
   *
   * ⚠️ Просит его тот, кому он нужен, — хаб. Главная и карта сайта ходят без него
   * и фильтруют сами (`isAuthorLinkable`): у `booksCount` есть история, когда он
   * был нулём у всех авторов разом, и фильтр по умолчанию опустошил бы три
   * страницы одновременно.
   */
  hasBooks?: boolean;
};

/**
 * Get public list of authors.
 *
 * ⚠️ У этой функции три читателя: хаб авторов, блок авторов на главной
 * (`app/[lang]/page.tsx:107`) и две ветки карты сайта
 * (`app/sitemaps/[filename]/route.ts`). Меняешь её — смотри на всех троих.
 *
 * Потолок `limit` на бэкенде — 100, и превышение отдаёт 400, а не усечение:
 * молча урезанный список ломает hreflang авторских страниц, а отказ читается
 * как «язык неизвестен» и альтернативы сохраняет. Кому нужен весь список,
 * листает через `fetchAllPages`.
 */
export const getPublicAuthors = async (
  lang: SupportedLang,
  params: PublicAuthorsParams = {}
): Promise<PaginatedResponse<AuthorListItem>> => {
  const { page = 1, limit = 50, search, letter, sort, hasBooks } = params;
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  // Пустые значения не отправляем: с `forbidNonWhitelisted` на бэкенде лишний
  // параметр — это 400, а `?search=` без значения фильтровал бы по пустой строке.
  if (search) queryParams.append('search', search);
  if (letter) queryParams.append('letter', letter);
  if (sort) queryParams.append('sort', sort);
  if (hasBooks) queryParams.append('hasBooks', 'true');

  const endpoint = buildLangPath(lang, `/authors?${queryParams.toString()}`);
  // `language` и `revalidate` тут не было, в отличие от всех соседних выборок:
  // без первого не уходит `Accept-Language`, без второго ответ застывает
  // с данными времени сборки. Карту сайта это не задевает — у её маршрута
  // объявлен `fetchCache = 'force-no-store'`.
  // Поиск мимо кэша данных. Строка поиска — произвольный ввод до ста знаков,
  // и каждая её вариация стала бы отдельным ключом и отдельным файлом в
  // `.next/cache/fetch-cache`, у которого нет лимита по диску: обход по
  // случайным `?search=` раздул бы кэш контейнера. Странице поиска кэш всё
  // равно ничего не даёт — она `noindex`.
  return httpGet<PaginatedResponse<AuthorListItem>>(endpoint, {
    language: lang,
    next: search ? { revalidate: 0 } : { revalidate: 300 },
  });
};

/**
 * Буквы алфавитного указателя авторов и число авторов под каждой.
 *
 * Алфавит приходит целиком, вместе с буквами, под которыми ноль: погашенную
 * букву рисует указатель, а знать состав алфавита пяти языков ему для этого
 * не нужно. Счётчики уже отфильтрованы «только с книгами» — тем же правилом,
 * которым отфильтрована сетка, иначе буква говорила бы одно, а карточки другое.
 */
export const getAuthorLetters = async (
  lang: SupportedLang,
  search?: string
): Promise<AuthorLetter[]> => {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const endpoint = buildLangPath(lang, `/authors/letters${query}`);
  return httpGet<AuthorLetter[]>(endpoint, {
    language: lang,
    next: search ? { revalidate: 0 } : { revalidate: 300 },
  });
};
