/**
 * React Query hooks for the summary run «Write Summary» (F06-2, F06-3), `admin` only.
 *
 * Ход идёт фоном на бэкенде: последний ход версии перечитывается раз в несколько секунд, пока он
 * строится и его операция `active` или пока идёт перегенерация какого-то текста; пауза, отказ
 * и готовность без перегенераций — без опроса. Записи хода в поля пересказа («Accept», «Accept
 * all», прямые записи) сбрасывают запросы пересказа версии: поля вкладки показывают записанное.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import type { BookSummarySectionList, SummaryWrite, SummaryWriteState } from '@/types/api-schema';
import {
  CONTENT_DRAFT_LOCAL_CODES,
  DRAFT_RUN_REFETCH_MS,
  draftRunRefetchInterval,
  summaryWriteKeys,
} from './draftKeys';
import { summaryKeys } from './useBookSummary';
import { useContentDraftActions } from './useContentDraftActions';

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

/**
 * Старт, «продолжить», перестройка досье и действия над текстами хода. После ответа — и при отказе:
 * 409 значит, что на экране устаревшее состояние, — ход перечитывается; «Accept» и «Accept all»
 * сбрасывают и разделы этой версии — список и раскрытые карточки (`summaryKeys.section`), иначе
 * карточка сохранила бы старый текст поверх принятого. Полный и «Очень кратко» перечитывает
 * форма вкладки сама (`reloadFields`): второго запроса того же пересказа нет.
 */
export const useSummaryWriteActions = (versionId: string) => {
  const queryClient = useQueryClient();
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
  const actions = useContentDraftActions<SummaryWrite, { confirmChapterChange?: boolean }>({
    versionId,
    latestKey: summaryWriteKeys.latest(versionId),
    start: (data) => startSummaryWrite(versionId, data),
    regenerate: ({ id, index, remark }) =>
      regenerateSummaryItem(id, index, remark ? { remark } : {}),
    accept: ({ id, index, confirmChapterChange }) =>
      acceptSummaryItem(id, index, confirmChapterChange ? { confirmChapterChange } : {}),
    discardItem: ({ id, index }) => discardSummaryItem(id, index),
    discardRun: (id) => discardSummaryWriteRun(id),
    acceptAll: (id) => acceptAllSummaryItems(id),
    afterWrite: () => refreshFields(),
  });
  return {
    ...actions,
    /** Ход записал поля сам (прямая запись): разделы версии перечитываются. */
    refreshFields,
  };
};

export type SummaryWriteActions = ReturnType<typeof useSummaryWriteActions>;
