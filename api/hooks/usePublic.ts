/**
 * React Query hooks for public endpoints
 *
 * Provides typed hooks for working with public data
 * with automatic caching via React Query.
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
 * Hook for getting book overview
 *
 * @param lang - Language
 * @param slug - Book slug
 * @param options - React Query options
 * @returns Query result with book data
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
 * Hook for getting CMS page
 *
 * @param lang - Language
 * @param slug - Page slug
 * @param options - React Query options
 * @returns Query result with page data
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
 * Hook for getting category books
 *
 * @param lang - Language
 * @param slug - Category slug
 * @param page - Page number
 * @param limit - Limit per page
 * @param options - React Query options
 * @returns Query result with category books
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
 * Hook for getting tag books
 *
 * @param lang - Language
 * @param slug - Tag slug
 * @param page - Page number
 * @param limit - Limit per page
 * @param options - React Query options
 * @returns Query result with tag books
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
 * Hook for getting SEO data
 *
 * @param lang - Language
 * @param type - Entity type
 * @param id - Entity ID
 * @param options - React Query options
 * @returns Query result with SEO data
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
