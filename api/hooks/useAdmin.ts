/**
 * React Query хуки для админки
 *
 * Содержит хуки для работы с административными данными через React Query
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  createBookVersion,
  createChapter,
  deleteChapter,
  getBooks,
  getBookVersion,
  getChapters,
  publishVersion,
  reorderChapters,
  unpublishVersion,
  updateBookVersion,
  updateChapter,
  type GetBooksParams,
} from '@/api/endpoints/admin';
import type {
  BookOverview,
  BookVersionDetail,
  ChapterDetail,
  CreateBookVersionRequest,
  CreateChapterRequest,
  PaginatedResponse,
  ReorderChaptersRequest,
  UpdateBookVersionRequest,
  UpdateChapterRequest,
} from '@/types/api-schema';

/**
 * Query ключи для книг
 */
export const bookKeys = {
  /** Все запросы книг */
  all: ['books'] as const,
  /** Списки книг */
  lists: () => [...bookKeys.all, 'list'] as const,
  /** Список книг с параметрами */
  list: (params: GetBooksParams) => [...bookKeys.lists(), params] as const,
  /** Детали конкретной книги */
  details: () => [...bookKeys.all, 'detail'] as const,
  /** Детали книги по ID */
  detail: (id: string) => [...bookKeys.details(), id] as const,
};

/**
 * Query ключи для версий книг
 */
export const versionKeys = {
  /** Все запросы версий */
  all: ['versions'] as const,
  /** Детали версий */
  details: () => [...versionKeys.all, 'detail'] as const,
  /** Детали версии по ID */
  detail: (id: string) => [...versionKeys.details(), id] as const,
};

/**
 * Хук для получения списка книг
 *
 * @param params - Параметры запроса (пагинация, поиск, фильтры)
 * @param options - Опции React Query
 * @returns React Query результат со списком книг
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useBooks({
 *   page: 1,
 *   limit: 20,
 *   search: 'tolkien',
 * });
 * ```
 */
export const useBooks = (
  params: GetBooksParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<BookOverview>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: bookKeys.list(params),
    queryFn: () => getBooks(params),
    staleTime: 5 * 60 * 1000, // 5 минут
    ...options,
  });
};

/**
 * Хук для получения детальной информации о версии книги
 *
 * @param versionId - ID версии книги
 * @param options - Опции React Query
 * @returns React Query результат с деталями версии
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useBookVersion('version-uuid');
 * ```
 */
export const useBookVersion = (
  versionId: string,
  options?: Omit<UseQueryOptions<BookVersionDetail>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: versionKeys.detail(versionId),
    queryFn: () => getBookVersion(versionId),
    staleTime: 5 * 60 * 1000, // 5 минут
    ...options,
  });
};

/**
 * Хук для создания новой версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для создания версии
 *
 * @example
 * ```tsx
 * const createMutation = useCreateBookVersion({
 *   onSuccess: (data) => {
 *     console.log('Version created:', data.id);
 *   }
 * });
 *
 * createMutation.mutate({
 *   bookId: 'book-uuid',
 *   data: {
 *     language: 'en',
 *     title: 'Harry Potter',
 *     author: 'J.K. Rowling',
 *     type: 'text',
 *     isFree: true
 *   }
 * });
 * ```
 */
export const useCreateBookVersion = (
  options?: UseMutationOptions<
    BookVersionDetail,
    Error,
    { bookId: string; data: CreateBookVersionRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, data }) => createBookVersion(bookId, data),
    onSuccess: (data, _variables) => {
      // Инвалидируем список книг для обновления
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
      // Устанавливаем данные версии в кэш
      queryClient.setQueryData(versionKeys.detail(data.id), data);
    },
    ...options,
  });
};

/**
 * Хук для обновления существующей версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для обновления версии
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateBookVersion({
 *   onSuccess: () => {
 *     toast.success('Version updated');
 *   }
 * });
 *
 * updateMutation.mutate({
 *   versionId: 'version-uuid',
 *   data: {
 *     title: 'Updated Title'
 *   }
 * });
 * ```
 */
export const useUpdateBookVersion = (
  options?: UseMutationOptions<
    BookVersionDetail,
    Error,
    { versionId: string; data: UpdateBookVersionRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => updateBookVersion(versionId, data),
    onSuccess: (data, variables) => {
      // Обновляем данные версии в кэше
      queryClient.setQueryData(versionKeys.detail(variables.versionId), data);
      // Инвалидируем список книг
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для публикации версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для публикации
 *
 * @example
 * ```tsx
 * const publishMutation = usePublishVersion({
 *   onSuccess: () => {
 *     toast.success('Version published');
 *   }
 * });
 *
 * publishMutation.mutate('version-uuid');
 * ```
 */
export const usePublishVersion = (
  options?: UseMutationOptions<BookVersionDetail, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => publishVersion(versionId),
    onSuccess: (data, versionId) => {
      // Обновляем данные версии в кэше
      queryClient.setQueryData(versionKeys.detail(versionId), data);
      // Инвалидируем список книг
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для снятия версии с публикации
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для снятия с публикации
 *
 * @example
 * ```tsx
 * const unpublishMutation = useUnpublishVersion({
 *   onSuccess: () => {
 *     toast.info('Version unpublished');
 *   }
 * });
 *
 * unpublishMutation.mutate('version-uuid');
 * ```
 */
export const useUnpublishVersion = (
  options?: UseMutationOptions<BookVersionDetail, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => unpublishVersion(versionId),
    onSuccess: (data, versionId) => {
      // Обновляем данные версии в кэше
      queryClient.setQueryData(versionKeys.detail(versionId), data);
      // Инвалидируем список книг
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
    ...options,
  });
};

/**
 * ===========================
 * Chapter Hooks
 * ===========================
 */

/**
 * Query ключи для глав
 */
export const chapterKeys = {
  /** Все запросы глав */
  all: ['chapters'] as const,
  /** Списки глав */
  lists: () => [...chapterKeys.all, 'list'] as const,
  /** Список глав конкретной версии */
  list: (versionId: string) => [...chapterKeys.lists(), versionId] as const,
  /** Детали глав */
  details: () => [...chapterKeys.all, 'detail'] as const,
  /** Детали главы по ID */
  detail: (id: string) => [...chapterKeys.details(), id] as const,
};

/**
 * Хук для получения списка глав версии книги
 *
 * @param versionId - ID версии книги
 * @param options - Опции React Query
 * @returns React Query результат со списком глав
 *
 * @example
 * ```tsx
 * const { data: chapters, isLoading } = useChapters('version-uuid');
 * ```
 */
export const useChapters = (
  versionId: string,
  options?: Omit<UseQueryOptions<ChapterDetail[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: chapterKeys.list(versionId),
    queryFn: () => getChapters(versionId),
    staleTime: 5 * 60 * 1000, // 5 минут
    ...options,
  });
};

/**
 * Хук для создания новой главы
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для создания главы
 *
 * @example
 * ```tsx
 * const createMutation = useCreateChapter({
 *   onSuccess: () => {
 *     toast.success('Chapter created');
 *   }
 * });
 *
 * createMutation.mutate({
 *   versionId: 'version-uuid',
 *   data: {
 *     orderIndex: 1,
 *     title: 'Introduction',
 *     content: '# Chapter 1\n\nContent...',
 *     isFree: true
 *   }
 * });
 * ```
 */
export const useCreateChapter = (
  options?: UseMutationOptions<
    ChapterDetail,
    Error,
    { versionId: string; data: CreateChapterRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => createChapter(versionId, data),
    onSuccess: (data, variables) => {
      // Инвалидируем список глав версии
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(variables.versionId) });
      // Устанавливаем данные главы в кэш
      queryClient.setQueryData(chapterKeys.detail(data.id), data);
    },
    ...options,
  });
};

/**
 * Хук для обновления главы
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для обновления главы
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateChapter({
 *   onSuccess: () => {
 *     toast.success('Chapter updated');
 *   }
 * });
 *
 * updateMutation.mutate({
 *   chapterId: 'chapter-uuid',
 *   data: {
 *     title: 'Updated Title',
 *     content: 'New content...'
 *   }
 * });
 * ```
 */
export const useUpdateChapter = (
  options?: UseMutationOptions<
    ChapterDetail,
    Error,
    { chapterId: string; data: UpdateChapterRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chapterId, data }) => updateChapter(chapterId, data),
    onSuccess: (data, variables) => {
      // Обновляем данные главы в кэше
      queryClient.setQueryData(chapterKeys.detail(variables.chapterId), data);
      // Инвалидируем список глав версии
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(data.versionId) });
    },
    ...options,
  });
};

/**
 * Хук для удаления главы
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для удаления главы
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteChapter({
 *   onSuccess: () => {
 *     toast.success('Chapter deleted');
 *   }
 * });
 *
 * deleteMutation.mutate({
 *   chapterId: 'chapter-uuid',
 *   versionId: 'version-uuid'
 * });
 * ```
 */
export const useDeleteChapter = (
  options?: UseMutationOptions<void, Error, { chapterId: string; versionId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chapterId }) => deleteChapter(chapterId),
    onSuccess: (_data, variables) => {
      // Инвалидируем список глав версии
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(variables.versionId) });
      // Удаляем главу из кэша
      queryClient.removeQueries({ queryKey: chapterKeys.detail(variables.chapterId) });
    },
    ...options,
  });
};

/**
 * Хук для переупорядочивания глав
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для переупорядочивания
 *
 * @example
 * ```tsx
 * const reorderMutation = useReorderChapters({
 *   onSuccess: () => {
 *     toast.success('Chapters reordered');
 *   }
 * });
 *
 * reorderMutation.mutate({
 *   versionId: 'version-uuid',
 *   data: {
 *     chapterIds: ['chapter-3', 'chapter-1', 'chapter-2']
 *   }
 * });
 * ```
 */
export const useReorderChapters = (
  options?: UseMutationOptions<
    ChapterDetail[],
    Error,
    { versionId: string; data: ReorderChaptersRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => reorderChapters(versionId, data),
    onSuccess: (_data, variables) => {
      // Инвалидируем список глав для обновления
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(variables.versionId) });
    },
    ...options,
  });
};
