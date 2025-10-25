/**
 * Конфигурация React Query
 *
 * Содержит настройки QueryClient, определение ключей кэша,
 * и стратегии retry для разных типов ошибок.
 */

import { QueryClient, type DefaultOptions } from '@tanstack/react-query';
import { ApiError } from '@/types/api';

/**
 * Определяет, нужно ли делать retry для ошибки
 *
 * @param failureCount - Количество неудачных попыток
 * @param error - Ошибка
 * @returns true если нужно сделать retry
 */
const shouldRetry = (failureCount: number, error: unknown): boolean => {
  // Не делаем retry для ApiError
  if (error instanceof ApiError) {
    const status = error.statusCode;

    // Не retry для клиентских ошибок (4xx), кроме 429
    if (status >= 400 && status < 500) {
      // Для 429 делаем 1-2 попытки
      if (status === 429) {
        return failureCount < 2;
      }
      // Остальные 4xx не retry
      return false;
    }

    // Для серверных ошибок (5xx) делаем 2-3 попытки
    if (status >= 500) {
      return failureCount < 3;
    }
  }

  // Для остальных ошибок (сетевых) делаем 2 попытки
  return failureCount < 2;
};

/**
 * Дефолтные опции для React Query
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // Время, в течение которого данные считаются актуальными
    staleTime: 30 * 1000, // 30 секунд

    // Время, в течение которого кэш хранится в памяти
    gcTime: 5 * 60 * 1000, // 5 минут (ранее cacheTime)

    // Стратегия retry
    retry: shouldRetry,

    // Не делать refetch при фокусе окна для стабильности
    refetchOnWindowFocus: false,

    // Refetch при монтировании только если данные stale
    refetchOnMount: true,

    // Не делать refetch при reconnect по умолчанию
    refetchOnReconnect: false,
  },
  mutations: {
    // Для мутаций не делаем retry на 4xx ошибках
    retry: (failureCount, error) => {
      if (error instanceof ApiError) {
        const status = error.statusCode;
        // Не retry для клиентских ошибок
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      // Для остальных делаем 1 попытку
      return failureCount < 1;
    },
  },
};

/**
 * Фабрика для создания QueryClient
 *
 * @returns Новый экземпляр QueryClient
 */
export const createQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions,
  });
};

/**
 * Глобальный QueryClient для использования в приложении
 * Создаётся один раз при старте приложения
 */
let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Получить QueryClient для использования в приложении
 *
 * @returns QueryClient instance
 */
export const getQueryClient = (): QueryClient => {
  // На сервере всегда создаём новый клиент
  if (typeof window === 'undefined') {
    return createQueryClient();
  }

  // На клиенте используем singleton
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }

  return browserQueryClient;
};

/**
 * Ключи кэша для React Query
 *
 * Централизованное определение ключей для предсказуемого кэширования
 */
export const queryKeys = {
  /** Обзор книги: ['bookOverview', lang, slug] */
  bookOverview: (lang: string, slug: string) => ['bookOverview', lang, slug] as const,

  /** Версии книги: ['bookVersions', bookId, filters] */
  bookVersions: (bookId: string, filters?: { lang?: string; type?: string; isFree?: boolean }) =>
    ['bookVersions', bookId, filters] as const,

  /** CMS страница: ['page', lang, slug] */
  page: (lang: string, slug: string) => ['page', lang, slug] as const,

  /** Книги категории: ['categoryBooks', lang, slug, page, limit] */
  categoryBooks: (lang: string, slug: string, page?: number, limit?: number) =>
    ['categoryBooks', lang, slug, { page, limit }] as const,

  /** Книги по тегу: ['tagBooks', lang, slug, page, limit] */
  tagBooks: (lang: string, slug: string, page?: number, limit?: number) =>
    ['tagBooks', lang, slug, { page, limit }] as const,

  /** SEO данные: ['seoResolve', lang, type, id] */
  seoResolve: (lang: string, type: string, id: string) => ['seoResolve', lang, type, id] as const,

  /** Данные текущего пользователя: ['me'] */
  me: () => ['me'] as const,

  /** Прогресс чтения пользователя: ['readingProgress', versionId] */
  readingProgress: (versionId: string) => ['readingProgress', versionId] as const,

  /** Полка пользователя: ['bookshelf', page, limit] */
  bookshelf: (page?: number, limit?: number) => ['bookshelf', { page, limit }] as const,
} as const;

/**
 * Настройки staleTime для разных типов запросов
 */
export const staleTimeConfig = {
  /** Публичные данные (книги, страницы) - 30 секунд */
  public: 30 * 1000,

  /** Каталоги и списки - 5 минут */
  catalog: 5 * 60 * 1000,

  /** SEO данные - 10 минут */
  seo: 10 * 60 * 1000,

  /** Пользовательские данные - 0 (всегда свежие) */
  user: 0,

  /** Статические данные - 1 час */
  static: 60 * 60 * 1000,
} as const;
