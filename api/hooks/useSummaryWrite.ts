/**
 * React Query hooks for the summary run «Write Summary» (F06-2, F06-3), `admin` only.
 *
 * Ход идёт фоном на бэкенде: последний ход версии перечитывается раз в несколько секунд, пока он
 * строится и его операция `active` или пока идёт перегенерация какого-то текста; пауза, отказ
 * и готовность без перегенераций — без опроса. Записи хода в поля пересказа («Accept», «Accept
 * all», прямые записи) сбрасывают запросы пересказа версии: поля вкладки показывают записанное.
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resumeLlmOperation } from '@/api/endpoints/admin/llm';
import {
  acceptAllSummaryItems,
  acceptSummaryItem,
  discardSummaryItem,
  discardSummaryWriteRun,
  getSummaryWrite,
  getSummaryWriteEstimate,
  regenerateSummaryItem,
  startSummaryWrite,
} from '@/api/endpoints/admin/summary-write';
import type { ApiError } from '@/types/api';
import type {
  BookSummarySectionList,
  ContentDraftAcceptAll,
  ContentDraftRun,
  LlmOperation,
  SummaryWrite,
  SummaryWriteState,
} from '@/types/api-schema';
import {
  CONTENT_DRAFT_LOCAL_CODES,
  DRAFT_RUN_REFETCH_MS,
  draftRunRefetchInterval,
  summaryWriteKeys,
} from './draftKeys';
import { summaryKeys } from './useBookSummary';
import { useRebuildDossier } from './useRebuildDossier';

export { isRegenPaused, isRegenRunning, summaryWriteKeys } from './draftKeys';

/** Пока ход пишется или перегенерирует текст, он перечитывается с этим шагом. */
export const SUMMARY_WRITE_REFETCH_MS = DRAFT_RUN_REFETCH_MS;

/** Перечитывать, пока ход строится с идущей операцией или идёт перегенерация; запрос упал — опрос встаёт. */
export const summaryWriteRefetchInterval = (
  state: SummaryWriteState | undefined,
  failed = false
): number | false => draftRunRefetchInterval(state?.draft, failed);

export const useSummaryWrite = (versionId: string, enabled: boolean) =>
  useQuery({
    queryKey: summaryWriteKeys.latest(versionId),
    queryFn: () => getSummaryWrite(versionId),
    enabled,
    refetchInterval: (query) =>
      summaryWriteRefetchInterval(query.state.data, query.state.status === 'error'),
  });

/** Оценка до старта: запрос уходит, только когда окно подтверждения открыто. */
export const useSummaryWriteEstimate = (versionId: string, enabled: boolean) =>
  useQuery({
    queryKey: summaryWriteKeys.estimate(versionId),
    queryFn: () => getSummaryWriteEstimate(versionId),
    enabled,
    retry: false,
    staleTime: 0,
    meta: CONTENT_DRAFT_LOCAL_CODES,
  });

interface ItemVars {
  id: string;
  index: number;
}

/**
 * Старт, «продолжить», перестройка досье и действия над текстами хода. После ответа — и при отказе:
 * 409 значит, что на экране устаревшее состояние, — ход перечитывается; «Accept» и «Accept all»
 * сбрасывают и разделы этой версии — список и раскрытые карточки (`summaryKeys.section`), иначе
 * карточка сохранила бы старый текст поверх принятого. Полный и «Очень кратко» перечитывает
 * форма вкладки сама (`reloadFields`): второго запроса того же пересказа нет.
 */
export const useSummaryWriteActions = (versionId: string) => {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: summaryWriteKeys.latest(versionId) });
  /** Разделы этой версии: список и тексты разделов из него (раскрытые карточки). */
  const refreshFields = useCallback(() => {
    const list = queryClient.getQueryData<BookSummarySectionList>(summaryKeys.sections(versionId));
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: summaryKeys.sections(versionId) }),
      ...(list?.sections ?? []).map((section) =>
        queryClient.invalidateQueries({ queryKey: summaryKeys.section(section.id) })
      ),
    ]);
  }, [queryClient, versionId]);
  const refreshWithFields = () => Promise.all([refresh(), refreshFields()]);

  const start = useMutation<SummaryWrite, ApiError, { limitUsd?: string }>({
    mutationFn: (data) => startSummaryWrite(versionId, data),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    onSettled: refresh,
  });
  const resume = useMutation<LlmOperation, ApiError, { id: string; limitUsd?: string }>({
    mutationFn: ({ id, limitUsd }) => resumeLlmOperation(id, limitUsd),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    onSettled: refresh,
  });
  const discardRun = useMutation<ContentDraftRun, ApiError, string>({
    mutationFn: (id) => discardSummaryWriteRun(id),
    // Отбрасывание хода полей не трогает.
    onSettled: refresh,
  });
  const regenerate = useMutation<ContentDraftRun, ApiError, ItemVars & { remark?: string }>({
    mutationFn: ({ id, index, remark }) =>
      regenerateSummaryItem(id, index, remark ? { remark } : {}),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    onSettled: refresh,
  });
  const accept = useMutation<
    ContentDraftRun,
    ApiError,
    ItemVars & { confirmChapterChange?: boolean }
  >({
    mutationFn: ({ id, index, confirmChapterChange }) =>
      acceptSummaryItem(id, index, confirmChapterChange ? { confirmChapterChange } : {}),
    onSettled: refreshWithFields,
  });
  const discardItem = useMutation<ContentDraftRun, ApiError, ItemVars>({
    mutationFn: ({ id, index }) => discardSummaryItem(id, index),
    onSettled: refresh,
  });
  const acceptAll = useMutation<ContentDraftAcceptAll, ApiError, string>({
    mutationFn: (id) => acceptAllSummaryItems(id),
    onSettled: refreshWithFields,
  });
  const rebuildDossier = useRebuildDossier(versionId);
  return {
    start,
    resume,
    discardRun,
    regenerate,
    accept,
    discardItem,
    acceptAll,
    rebuildDossier,
    /** Ход записал поля сам (прямая запись): разделы версии перечитываются. */
    refreshFields,
  };
};

export type SummaryWriteActions = ReturnType<typeof useSummaryWriteActions>;
