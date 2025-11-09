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
  attachCategory,
  attachTag,
  createBook,
  createBookVersion,
  createChapter,
  createPage,
  deleteChapter,
  deletePage,
  detachCategory,
  detachTag,
  getBooks,
  getBookVersion,
  getCategories,
  getCategoriesTree,
  getChapters,
  getPageById,
  getPages,
  getTags,
  publishPage,
  publishVersion,
  reorderChapters,
  unpublishPage,
  unpublishVersion,
  updateBookVersion,
  updateChapter,
  updatePage,
  type GetBooksParams,
  type GetCategoriesParams,
  type GetPagesParams,
  type GetTagsParams,
} from '@/api/endpoints/admin';
import type {
  BookOverview,
  BookVersionDetail,
  Category,
  CategoryTree,
  ChapterDetail,
  CreateBookRequest,
  CreateBookResponse,
  CreateBookVersionRequest,
  CreateChapterRequest,
  CreatePageRequest,
  PageResponse,
  PaginatedResponse,
  ReorderChaptersRequest,
  Tag,
  UpdateBookVersionRequest,
  UpdateChapterRequest,
  UpdatePageRequest,
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
 * Хук для создания новой книги (контейнера)
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для создания книги
 *
 * @example
 * ```tsx
 * const createBookMutation = useCreateBook();
 *
 * const handleCreateBook = async () => {
 *   const book = await createBookMutation.mutateAsync({
 *     slug: 'my-awesome-book'
 *   });
 *   console.log('Created book:', book);
 * };
 * ```
 */
export const useCreateBook = (
  options?: Omit<UseMutationOptions<CreateBookResponse, Error, CreateBookRequest>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      // Инвалидируем список книг после создания
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
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

/**
 * ========================================
 * Categories Hooks
 * ========================================
 */

/**
 * Query ключи для категорий
 */
export const categoryKeys = {
  /** Все запросы категорий */
  all: ['categories'] as const,
  /** Списки категорий */
  lists: () => [...categoryKeys.all, 'list'] as const,
  /** Список категорий с параметрами */
  list: (params: GetCategoriesParams) => [...categoryKeys.lists(), params] as const,
  /** Дерево категорий */
  tree: () => [...categoryKeys.all, 'tree'] as const,
};

/**
 * Хук для получения списка категорий
 *
 * @param params - Параметры запроса
 * @param options - Опции React Query
 * @returns React Query результат со списком категорий
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useCategories({ page: 1, limit: 50 });
 * ```
 */
export const useCategories = (
  params: GetCategoriesParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Category>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => getCategories(params),
    staleTime: 10 * 60 * 1000, // 10 минут
    ...options,
  });
};

/**
 * Хук для получения дерева категорий
 *
 * @param options - Опции React Query
 * @returns React Query результат с деревом категорий
 *
 * @example
 * ```tsx
 * const { data: tree, isLoading } = useCategoriesTree();
 * ```
 */
export const useCategoriesTree = (
  options?: Omit<UseQueryOptions<CategoryTree[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: categoryKeys.tree(),
    queryFn: () => getCategoriesTree(),
    staleTime: 10 * 60 * 1000, // 10 минут
    ...options,
  });
};

/**
 * Хук для привязывания категории к версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const attachMutation = useAttachCategory({
 *   onSuccess: () => {
 *     toast.success('Category attached');
 *   }
 * });
 *
 * attachMutation.mutate({
 *   versionId: 'version-uuid',
 *   categoryId: 'category-uuid'
 * });
 * ```
 */
export const useAttachCategory = (
  options?: UseMutationOptions<void, Error, { versionId: string; categoryId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, categoryId }) => attachCategory(versionId, categoryId),
    onSuccess: (_data, variables) => {
      // Инвалидируем данные версии для обновления
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
    },
    ...options,
  });
};

/**
 * Хук для отвязывания категории от версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const detachMutation = useDetachCategory({
 *   onSuccess: () => {
 *     toast.success('Category detached');
 *   }
 * });
 *
 * detachMutation.mutate({
 *   versionId: 'version-uuid',
 *   categoryId: 'category-uuid'
 * });
 * ```
 */
export const useDetachCategory = (
  options?: UseMutationOptions<void, Error, { versionId: string; categoryId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, categoryId }) => detachCategory(versionId, categoryId),
    onSuccess: (_data, variables) => {
      // Инвалидируем данные версии для обновления
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
    },
    ...options,
  });
};

/**
 * ========================================
 * Tags Hooks
 * ========================================
 */

/**
 * Query ключи для тегов
 */
export const tagKeys = {
  /** Все запросы тегов */
  all: ['tags'] as const,
  /** Списки тегов */
  lists: () => [...tagKeys.all, 'list'] as const,
  /** Список тегов с параметрами */
  list: (params: GetTagsParams) => [...tagKeys.lists(), params] as const,
};

/**
 * Хук для получения списка тегов
 *
 * @param params - Параметры запроса
 * @param options - Опции React Query
 * @returns React Query результат со списком тегов
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useTags({ page: 1, limit: 50, search: 'motiv' });
 * ```
 */
export const useTags = (
  params: GetTagsParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Tag>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: tagKeys.list(params),
    queryFn: () => getTags(params),
    staleTime: 10 * 60 * 1000, // 10 минут
    ...options,
  });
};

/**
 * Хук для привязывания тега к версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const attachMutation = useAttachTag({
 *   onSuccess: () => {
 *     toast.success('Tag attached');
 *   }
 * });
 *
 * attachMutation.mutate({
 *   versionId: 'version-uuid',
 *   tagId: 'tag-uuid'
 * });
 * ```
 */
export const useAttachTag = (
  options?: UseMutationOptions<void, Error, { versionId: string; tagId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, tagId }) => attachTag(versionId, tagId),
    onSuccess: (_data, variables) => {
      // Инвалидируем данные версии для обновления
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
    },
    ...options,
  });
};

/**
 * Хук для отвязывания тега от версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const detachMutation = useDetachTag({
 *   onSuccess: () => {
 *     toast.success('Tag detached');
 *   }
 * });
 *
 * detachMutation.mutate({
 *   versionId: 'version-uuid',
 *   tagId: 'tag-uuid'
 * });
 * ```
 */
export const useDetachTag = (
  options?: UseMutationOptions<void, Error, { versionId: string; tagId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, tagId }) => detachTag(versionId, tagId),
    onSuccess: (_data, variables) => {
      // Инвалидируем данные версии для обновления
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
    },
    ...options,
  });
};

/**
 * ========================================
 * CMS Pages Hooks
 * ========================================
 */

/**
 * Query ключи для страниц
 */
export const pageKeys = {
  /** Все запросы страниц */
  all: ['pages'] as const,
  /** Списки страниц */
  lists: () => [...pageKeys.all, 'list'] as const,
  /** Список страниц с параметрами */
  list: (params: GetPagesParams) => [...pageKeys.lists(), params] as const,
  /** Детали конкретной страницы */
  details: () => [...pageKeys.all, 'detail'] as const,
  /** Детали страницы по ID */
  detail: (id: string) => [...pageKeys.details(), id] as const,
};

/**
 * Хук для получения списка страниц
 *
 * @param params - Параметры запроса (пагинация, поиск, фильтры)
 * @param options - Опции React Query
 * @returns React Query результат со списком страниц
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = usePages({
 *   page: 1,
 *   limit: 20,
 *   status: 'published',
 * });
 * ```
 */
export const usePages = (
  params: GetPagesParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<PageResponse>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: pageKeys.list(params),
    queryFn: () => getPages(params),
    ...options,
  });
};

/**
 * Хук для получения деталей страницы
 *
 * ВАЖНО: Использует /admin/pages/:id БЕЗ :lang (как у versions)
 *
 * @param pageId - ID страницы
 * @param options - Опции React Query
 * @returns React Query результат с деталями страницы
 *
 * @example
 * ```tsx
 * const { data: page, isLoading } = usePage('page-uuid');
 * ```
 */
export const usePage = (
  pageId: string,
  options?: Omit<UseQueryOptions<PageResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: pageKeys.detail(pageId),
    queryFn: () => getPageById(pageId),
    enabled: !!pageId,
    ...options,
  });
};

/**
 * Хук для создания новой страницы
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const createMutation = useCreatePage({
 *   onSuccess: (page) => {
 *     router.push(`/admin/en/pages/${page.id}`);
 *   }
 * });
 *
 * createMutation.mutate({
 *   data: {
 *     slug: 'about-us',
 *     title: 'About Us',
 *     content: '# About Us\n\nWe are...',
 *     language: 'en'
 *   },
 *   lang: 'en'
 * });
 * ```
 */
export const useCreatePage = (
  options?: UseMutationOptions<PageResponse, Error, { data: CreatePageRequest; lang?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, lang = 'en' }) => createPage(data, lang),
    onSuccess: () => {
      // Инвалидируем список страниц для обновления
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для обновления страницы
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdatePage({
 *   onSuccess: () => {
 *     toast.success('Page updated');
 *   }
 * });
 *
 * updateMutation.mutate({
 *   pageId: 'page-uuid',
 *   data: { title: 'New Title' },
 *   lang: 'en'
 * });
 * ```
 */
export const useUpdatePage = (
  options?: UseMutationOptions<
    PageResponse,
    Error,
    { pageId: string; data: UpdatePageRequest; lang?: string }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, data, lang = 'en' }) => updatePage(pageId, data, lang),
    onSuccess: (data, variables) => {
      // Инвалидируем детали страницы и список
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(variables.pageId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для публикации страницы
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const publishMutation = usePublishPage({
 *   onSuccess: () => {
 *     toast.success('Page published');
 *   }
 * });
 *
 * publishMutation.mutate({ pageId: 'page-uuid', lang: 'en' });
 * ```
 */
export const usePublishPage = (
  options?: UseMutationOptions<PageResponse, Error, { pageId: string; lang?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, lang = 'en' }) => publishPage(pageId, lang),
    onSuccess: (data, variables) => {
      // Инвалидируем детали страницы и список
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(variables.pageId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для снятия страницы с публикации
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const unpublishMutation = useUnpublishPage({
 *   onSuccess: () => {
 *     toast.success('Page unpublished');
 *   }
 * });
 *
 * unpublishMutation.mutate({ pageId: 'page-uuid', lang: 'en' });
 * ```
 */
export const useUnpublishPage = (
  options?: UseMutationOptions<PageResponse, Error, { pageId: string; lang?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, lang = 'en' }) => unpublishPage(pageId, lang),
    onSuccess: (data, variables) => {
      // Инвалидируем детали страницы и список
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(variables.pageId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для удаления страницы
 *
 * Удаляет страницу из базы данных.
 * После успешного выполнения инвалидирует кэш списка страниц.
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeletePage({
 *   onSuccess: () => {
 *     toast.success('Page deleted successfully');
 *     router.push('/admin/en/pages');
 *   }
 * });
 *
 * deleteMutation.mutate({ pageId: 'page-uuid', lang: 'en' });
 * ```
 */
export const useDeletePage = (
  options?: UseMutationOptions<void, Error, { pageId: string; lang?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, lang = 'en' }) => deletePage(pageId, lang),
    onSuccess: (_data, variables) => {
      // Инвалидируем детали страницы и список
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(variables.pageId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};
