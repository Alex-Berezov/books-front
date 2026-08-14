/**
 * React Query configuration
 *
 * Contains QueryClient settings, cache key definitions,
 * and retry strategies for different error types.
 */

import { QueryClient, type DefaultOptions, type QueryClientConfig } from '@tanstack/react-query';
import { QUERY_CACHE_TIME } from '@/lib/queryClient.constants';
import { ApiError } from '@/types/api';

/**
 * Determines if retry should be attempted for an error
 *
 * @param failureCount - Number of failed attempts
 * @param error - Error
 * @returns true if retry should be attempted
 */
export const shouldRetry = (failureCount: number, error: unknown): boolean => {
  // Don't retry for ApiError
  if (error instanceof ApiError) {
    const status = error.statusCode;

    // Don't retry for client errors (4xx), except 429
    if (status >= 400 && status < 500) {
      // For 429, do 1-2 attempts
      if (status === 429) {
        return failureCount < 2;
      }
      // Don't retry other 4xx
      return false;
    }

    // For server errors (5xx), do 2-3 attempts
    if (status >= 500) {
      return failureCount < 3;
    }
  }

  // For other errors (network), do 2 attempts
  return failureCount < 2;
};

/**
 * Default options for React Query
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // Time during which data is considered fresh
    staleTime: QUERY_CACHE_TIME.STALE_TIME_MS,

    // Time during which cache is stored in memory
    gcTime: QUERY_CACHE_TIME.CACHE_TIME_MS,

    // Retry strategy
    retry: shouldRetry,

    // Don't refetch on window focus for stability
    refetchOnWindowFocus: false,

    // Refetch on mount only if data is stale
    refetchOnMount: true,

    // ⚠️ До LEGACY-141 файл в рантайме не участвовал, и здесь стояло `false`,
    // которое никогда не применялось: реальный клиент оставлял умолчание
    // react-query. Значение приведено к тому, что работало, а не к тому, что
    // было написано: с `false` читатель после разрыва связи остаётся на
    // снимке данных до разрыва, а `refetchOnWindowFocus` уже выключен и вернуть
    // данные больше нечем. Сведение источников не должно менять поведение
    // заодно; захотим выключить — это отдельное решение.
    refetchOnReconnect: true,
  },
  mutations: {
    // ⚠️ Мутации не повторяются. До LEGACY-141 этот блок в рантайм не попадал,
    // и умолчание react-query давало ноль попыток; здесь была написана одна
    // попытка на всё, кроме 4xx. Одна попытка означает повтор того же POST
    // после сетевого отказа или 503 — а отказ приходит и тогда, когда запись
    // на сервере уже прошла: читатель получает второй отзыв, вторую книгу,
    // вторую полку. Повтор мутации включается адресно на идемпотентной ручке,
    // а не глобально.
    retry: false,
  },
};

/**
 * Фабрика рабочего QueryClient.
 *
 * ⚠️ Это **единственный** источник настроек кэша (`LEGACY-141`). Раньше файл
 * выглядел настройкой, но клиент приложения создавался отдельным
 * `new QueryClient` в `providers/AppProviders.tsx` со своими опциями: правка
 * `retry`, `gcTime` или `refetchOn*` здесь проходила все проверки зелёной и ни
 * на что не влияла, а автор был уверен, что поменял поведение всего приложения.
 * Заводить второй `new QueryClient` в приложении нельзя — сторож на это стоит
 * в `__tests__/providers/appProviders.test.tsx`.
 *
 * Кэши запросов и мутаций (тосты на 5xx) приходят снаружи: они знают про
 * словари и про тост, а этому файлу знать про них незачем.
 *
 * @param config - queryCache и mutationCache вызывающей стороны
 * @returns New QueryClient instance
 */
export const createQueryClient = (
  config?: Pick<QueryClientConfig, 'queryCache' | 'mutationCache'>
): QueryClient => {
  return new QueryClient({
    ...config,
    defaultOptions,
  });
};

/**
 * Cache keys for React Query
 *
 * Centralized key definitions for predictable caching
 */
export const queryKeys = {
  /** Book overview: ['bookOverview', lang, slug] */
  bookOverview: (lang: string, slug: string) => ['bookOverview', lang, slug] as const,

  /** Public books list: ['publicBooks', lang, params] */
  publicBooks: (lang: string, params?: { page?: number; limit?: number }) =>
    ['publicBooks', lang, params || {}] as const,

  /** Book versions: ['bookVersions', bookId, filters] */
  bookVersions: (bookId: string, filters?: { lang?: string; type?: string; isFree?: boolean }) =>
    ['bookVersions', bookId, filters] as const,

  /** CMS page: ['page', lang, slug] */
  page: (lang: string, slug: string) => ['page', lang, slug] as const,

  /** Category books: ['categoryBooks', lang, slug, page, limit] */
  categoryBooks: (lang: string, slug: string, page?: number, limit?: number) =>
    ['categoryBooks', lang, slug, { page, limit }] as const,

  /** Books by tag: ['tagBooks', lang, slug, page, limit] */
  tagBooks: (lang: string, slug: string, page?: number, limit?: number) =>
    ['tagBooks', lang, slug, { page, limit }] as const,

  /** SEO data: ['seoResolve', lang, type, id] */
  seoResolve: (lang: string, type: string, id: string) => ['seoResolve', lang, type, id] as const,

  /** Current user data: ['me'] */
  me: () => ['me'] as const,

  /** User reading progress: ['readingProgress', versionId] */
  readingProgress: (versionId: string) => ['readingProgress', versionId] as const,

  /** Public tags list: ['publicTags', lang, params] */
  publicTags: (lang: string, params?: { page?: number; limit?: number }) =>
    ['publicTags', lang, params || {}] as const,

  /** User bookshelf: ['bookshelf', page, limit] */
  bookshelf: (page?: number, limit?: number) => ['bookshelf', { page, limit }] as const,
} as const;

/**
 * staleTime settings for different query types
 */
export const staleTimeConfig = {
  /** Public data (books, pages) - 30 seconds */
  public: 30 * 1000,

  /** Catalogs and lists - 5 minutes */
  catalog: 5 * 60 * 1000,

  /** SEO data - 10 minutes */
  seo: 10 * 60 * 1000,

  /** User data - 0 (always fresh) */
  user: 0,

  /** Static data - 1 hour */
  static: 60 * 60 * 1000,
} as const;
