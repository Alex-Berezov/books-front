/**
 * React Query хуки для публичных эндпоинтов
 *
 * Предоставляет типизированные хуки для работы с публичными данными
 * с автоматическим кэшированием через React Query.
 */

import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import * as publicApi from '@/api/endpoints/public';
import { queryKeys, staleTimeConfig } from '@/lib/queryClient';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { ApiError } from '@/types/api';
import type {
  BookOverview,
  PageResponse,
  CategoryBooksResponse,
  TagBooksResponse,
  SeoResolveResponse,
} from '@/types/api-schema';

/**
 * Хук для получения обзора книги
 *
 * @param lang - Язык
 * @param slug - Slug книги
 * @param options - Опции React Query
 * @returns Результат запроса с данными книги
 *
 * @example
 * ```tsx
 * function BookPage({ lang, slug }: Props) {
 *   const { data: book, isLoading, error } = useBookOverview(lang, slug);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!book) return null;
 *
 *   return <BookDetails book={book} />;
 * }
 * ```
 */
export const useBookOverview = (
  lang: SupportedLang,
  slug: string,
  options?: Omit<UseQueryOptions<BookOverview, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<BookOverview, ApiError> => {
  return useQuery<BookOverview, ApiError>({
    queryKey: queryKeys.bookOverview(lang, slug),
    queryFn: () => publicApi.getBookOverview(lang, slug),
    staleTime: staleTimeConfig.public,
    ...options,
  });
};

/**
 * Хук для получения CMS страницы
 *
 * @param lang - Язык
 * @param slug - Slug страницы
 * @param options - Опции React Query
 * @returns Результат запроса с данными страницы
 *
 * @example
 * ```tsx
 * function CMSPage({ lang, slug }: Props) {
 *   const { data: page, isLoading, error } = usePage(lang, slug);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!page) return null;
 *
 *   return <PageContent page={page} />;
 * }
 * ```
 */
export const usePage = (
  lang: SupportedLang,
  slug: string,
  options?: Omit<UseQueryOptions<PageResponse, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<PageResponse, ApiError> => {
  return useQuery<PageResponse, ApiError>({
    queryKey: queryKeys.page(lang, slug),
    queryFn: () => publicApi.getPage(lang, slug),
    staleTime: staleTimeConfig.public,
    ...options,
  });
};

/**
 * Хук для получения книг категории
 *
 * @param lang - Язык
 * @param slug - Slug категории
 * @param page - Номер страницы
 * @param limit - Лимит на страницу
 * @param options - Опции React Query
 * @returns Результат запроса с книгами категории
 *
 * @example
 * ```tsx
 * function CategoryPage({ lang, slug }: Props) {
 *   const { data, isLoading } = useCategoryBooks(lang, slug, 1, 20);
 *
 *   if (isLoading) return <Spinner />;
 *   if (!data) return null;
 *
 *   return (
 *     <>
 *       <h1>{data.category.name}</h1>
 *       <BookGrid books={data.data} />
 *     </>
 *   );
 * }
 * ```
 */
export const useCategoryBooks = (
  lang: SupportedLang,
  slug: string,
  page?: number,
  limit?: number,
  options?: Omit<UseQueryOptions<CategoryBooksResponse, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<CategoryBooksResponse, ApiError> => {
  return useQuery<CategoryBooksResponse, ApiError>({
    queryKey: queryKeys.categoryBooks(lang, slug, page, limit),
    queryFn: () => publicApi.getCategoryBooks(lang, slug, page, limit),
    staleTime: staleTimeConfig.catalog,
    ...options,
  });
};

/**
 * Хук для получения книг по тегу
 *
 * @param lang - Язык
 * @param slug - Slug тега
 * @param page - Номер страницы
 * @param limit - Лимит на страницу
 * @param options - Опции React Query
 * @returns Результат запроса с книгами по тегу
 *
 * @example
 * ```tsx
 * function TagPage({ lang, slug }: Props) {
 *   const { data, isLoading } = useTagBooks(lang, slug, 1, 20);
 *
 *   if (isLoading) return <Spinner />;
 *   if (!data) return null;
 *
 *   return (
 *     <>
 *       <h1>#{data.tag.name}</h1>
 *       <BookGrid books={data.data} />
 *     </>
 *   );
 * }
 * ```
 */
export const useTagBooks = (
  lang: SupportedLang,
  slug: string,
  page?: number,
  limit?: number,
  options?: Omit<UseQueryOptions<TagBooksResponse, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<TagBooksResponse, ApiError> => {
  return useQuery<TagBooksResponse, ApiError>({
    queryKey: queryKeys.tagBooks(lang, slug, page, limit),
    queryFn: () => publicApi.getTagBooks(lang, slug, page, limit),
    staleTime: staleTimeConfig.catalog,
    ...options,
  });
};

/**
 * Хук для получения SEO данных
 *
 * @param lang - Язык
 * @param type - Тип сущности
 * @param id - ID сущности
 * @param options - Опции React Query
 * @returns Результат запроса с SEO данными
 *
 * @example
 * ```tsx
 * function BookMeta({ lang, bookId }: Props) {
 *   const { data: seo } = useSeoResolve(lang, 'book', bookId);
 *
 *   return (
 *     <Head>
 *       <title>{seo?.title}</title>
 *       <meta name="description" content={seo?.description} />
 *     </Head>
 *   );
 * }
 * ```
 */
export const useSeoResolve = (
  lang: SupportedLang,
  type: 'book' | 'page' | 'category' | 'tag',
  id: string,
  options?: Omit<UseQueryOptions<SeoResolveResponse, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<SeoResolveResponse, ApiError> => {
  return useQuery<SeoResolveResponse, ApiError>({
    queryKey: queryKeys.seoResolve(lang, type, id),
    queryFn: () => publicApi.resolveSeo(lang, type, id),
    staleTime: staleTimeConfig.seo,
    ...options,
  });
};
