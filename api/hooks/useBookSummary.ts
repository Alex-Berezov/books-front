/**
 * React Query hooks for working with book summaries
 *
 * Book summary (пересказ/выжимка) is attached to a specific book version.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  createBookSummarySection,
  deleteBookSummarySection,
  getBookSummary,
  getBookSummarySection,
  getBookSummarySections,
  reorderBookSummarySections,
  updateBookSummarySection,
  upsertBookSummary,
  upsertBookSummaryBrief,
} from '@/api/endpoints/admin/bookSummaries';
import type {
  BookSummaryDetail,
  BookSummarySectionList,
  CreateBookSummarySectionRequest,
  DeleteBookSummarySectionRequest,
  ReorderBookSummarySectionsRequest,
  UpdateBookSummarySectionRequest,
  UpsertBookSummaryRequest,
} from '@/types/api-schema';

/**
 * Query keys for book summaries
 */
export const summaryKeys = {
  /** All summary queries */
  all: ['summaries'] as const,
  /** Summary details */
  details: () => [...summaryKeys.all, 'detail'] as const,
  /** Summary by version ID */
  detail: (versionId: string) => [...summaryKeys.details(), versionId] as const,
  /** Список разделов версии (F04) */
  sections: (versionId: string) => [...summaryKeys.all, 'sections', versionId] as const,
  /** Раздел с текстом по `id` */
  section: (sectionId: string) => [...summaryKeys.all, 'section', sectionId] as const,
};

/**
 * Hook for loading a book version summary.
 *
 * @param versionId - Book version ID
 * @param options - React Query options
 * @returns React Query result with summary or null
 */
export const useBookSummary = (
  versionId: string,
  options?: Omit<UseQueryOptions<BookSummaryDetail | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: summaryKeys.detail(versionId),
    queryFn: () => getBookSummary(versionId),
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook for upserting (creating/updating) a book version summary.
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for upserting summary
 */
export const useUpsertBookSummary = (
  options?: UseMutationOptions<
    BookSummaryDetail,
    Error,
    { versionId: string; data: UpsertBookSummaryRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => upsertBookSummary(versionId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: summaryKeys.detail(variables.versionId) });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/** Очень краткий пересказ (F04): своя ручка; ответ — запись пересказа целиком. */
export const useUpsertBookSummaryBrief = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, brief }: { versionId: string; brief: string | null }) =>
      upsertBookSummaryBrief(versionId, { brief }),
    // Идущее перечитывание пересказа (его запускает «Save Summary») отменяется: иначе его старый
    // `brief` лёг бы в кэш поверх ответа, и форма при возврате на вкладку заполнилась бы старым текстом.
    // Ответ очень краткого может нести полный пересказ старше записанного «Save Summary» (сервер
    // разводит записи замком в любом порядке), поэтому после него — свежее перечитывание.
    onSuccess: async (data, { versionId }) => {
      await queryClient.cancelQueries({ queryKey: summaryKeys.detail(versionId) });
      queryClient.setQueryData(summaryKeys.detail(versionId), data);
      void queryClient.invalidateQueries({ queryKey: summaryKeys.detail(versionId) });
    },
  });
};

/** Разделы пересказа версии без текстов (админка, по токену модератора). */
export const useBookSummarySections = (versionId: string) =>
  useQuery({
    queryKey: summaryKeys.sections(versionId),
    queryFn: () => getBookSummarySections(versionId),
    staleTime: 30 * 1000,
  });

/**
 * Текст раздела по `id` — грузится, когда карточка раскрыта, и перечитывается при каждом новом
 * раскрытии: другой редактор мог поправить раздел, а карточка взяла бы из кэша старый `updatedAt`
 * и получила 409. Свежий ответ заменяет только нетронутый черновик карточки, набранное не затирает.
 */
export const useBookSummarySection = (sectionId: string, enabled: boolean) =>
  useQuery({
    queryKey: summaryKeys.section(sectionId),
    queryFn: () => getBookSummarySection(sectionId),
    enabled,
    staleTime: 0,
  });

/**
 * Мутации разделов. Новый порядок из ответа кладётся в кэш списка: из него вкладка берёт следующий
 * `from`, и одинокий редактор не получает 409 на своё же прошлое действие (`tech.md` §4).
 */
export const useBookSummarySectionMutations = (versionId: string) => {
  const queryClient = useQueryClient();
  // Идущее перечитывание списка отменяется до записи ответа: иначе оно приходит позже и возвращает
  // старый порядок (удалённый раздел, прежние номера), а следующий `from` получает 409.
  const setList = async (data: BookSummarySectionList) => {
    await queryClient.cancelQueries({ queryKey: summaryKeys.sections(versionId) });
    queryClient.setQueryData<BookSummarySectionList>(summaryKeys.sections(versionId), {
      sections: data.sections,
    });
  };

  const create = useMutation({
    mutationFn: (data: CreateBookSummarySectionRequest) =>
      createBookSummarySection(versionId, data),
    onSuccess: async (res) => {
      queryClient.setQueryData(summaryKeys.section(res.section.id), res.section);
      await setList(res);
    },
  });
  const update = useMutation({
    mutationFn: ({
      sectionId,
      data,
    }: {
      sectionId: string;
      data: UpdateBookSummarySectionRequest;
    }) => updateBookSummarySection(sectionId, data),
    onSuccess: async (res) => {
      queryClient.setQueryData(summaryKeys.section(res.section.id), res.section);
      // Ответ правки несёт один раздел, а не порядок: отменённое перечитывание списка (например,
      // после 409) ему не заменить. Шло перечитывание — после подстановки оно запускается заново.
      const listKey = summaryKeys.sections(versionId);
      const wasFetching = queryClient.isFetching({ queryKey: listKey }) > 0;
      await queryClient.cancelQueries({ queryKey: listKey });
      queryClient.setQueryData<BookSummarySectionList>(listKey, (prev) =>
        prev
          ? {
              sections: prev.sections.map((s) =>
                s.id === res.section.id
                  ? {
                      id: s.id,
                      number: s.number,
                      title: res.section.title,
                      readerChapter: res.section.readerChapter,
                      updatedAt: res.section.updatedAt,
                    }
                  : s
              ),
            }
          : prev
      );
      if (wasFetching) void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
  const remove = useMutation({
    mutationFn: (data: DeleteBookSummarySectionRequest) =>
      deleteBookSummarySection(versionId, data),
    onSuccess: setList,
  });
  const reorder = useMutation({
    mutationFn: (data: ReorderBookSummarySectionsRequest) =>
      reorderBookSummarySections(versionId, data),
    onSuccess: setList,
  });
  return { create, update, remove, reorder };
};
