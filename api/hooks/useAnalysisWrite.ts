/**
 * React Query hooks for the analysis run «Write Analysis» (F07-3a), `admin` only.
 *
 * Ход идёт фоном на бэкенде: последний ход версии перечитывается раз в несколько секунд, пока он
 * строится и его операция `active` или пока идёт перегенерация какого-то блока; пауза, отказ
 * и готовность без перегенераций — без опроса. Форму анализа после записей хода («Accept»,
 * «Accept all», прямые записи) перечитывает вкладка сама (`onBlocksWritten`): второго запроса
 * того же анализа хуки не шлют.
 */

import { useIsMutating, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptAllAnalysisItems,
  acceptAnalysisItem,
  discardAnalysisItem,
  discardAnalysisWriteRun,
  getAnalysisWrite,
  getAnalysisWriteEstimate,
  getAnalysisWriteProposal,
  regenerateAnalysisItem,
  startAnalysisWrite,
} from '@/api/endpoints/admin/analysis-write';
import type { AnalysisWrite, AnalysisWriteState } from '@/types/api-schema';
import {
  analysisWriteKeys,
  CONTENT_DRAFT_LOCAL_CODES,
  DRAFT_RUN_REFETCH_MS,
  draftRunRefetchInterval,
} from './draftKeys';
import { useContentDraftActions } from './useContentDraftActions';

// Общие отказы ходов из досье — через барель хуков, рядом с ходом анализа (как прежде у заготовки).
export { analysisWriteKeys, CONTENT_DRAFT_LOCAL_CODES } from './draftKeys';

/** Пока ход пишется или перегенерирует блок, он перечитывается с этим шагом. */
export const ANALYSIS_WRITE_REFETCH_MS = DRAFT_RUN_REFETCH_MS;

/** Перечитывать, пока ход строится с идущей операцией или идёт перегенерация; запрос упал — опрос встаёт. */
export const analysisWriteRefetchInterval = (
  state: AnalysisWriteState | undefined,
  failed = false
): number | false => draftRunRefetchInterval(state?.draft, failed);

export const useAnalysisWrite = (versionId: string, enabled: boolean) =>
  useQuery({
    queryKey: analysisWriteKeys.latest(versionId),
    queryFn: () => getAnalysisWrite(versionId),
    enabled,
    refetchInterval: (query) =>
      analysisWriteRefetchInterval(query.state.data, query.state.status === 'error'),
  });

/**
 * В полёте «Accept», «Accept all» или «Regenerate» хода этой версии - ответ вот-вот запишет блоки
 * в анализ: «Save analysis» ждёт (решение арбитра `F07 | F07-3`, круг 3, Б1).
 */
export const useAnalysisWritesInFlight = (versionId: string): boolean =>
  useIsMutating({ mutationKey: analysisWriteKeys.writes(versionId) }) > 0;

/** Оценка до старта: запрос уходит, только когда окно подтверждения открыто. */
export const useAnalysisWriteEstimate = (versionId: string, enabled: boolean) =>
  useQuery({
    queryKey: analysisWriteKeys.estimate(versionId),
    queryFn: () => getAnalysisWriteEstimate(versionId),
    enabled,
    retry: false,
    staleTime: 0,
    meta: CONTENT_DRAFT_LOCAL_CODES,
  });

/**
 * Содержимое предложения: ручка отвечает только на предложение готового хода, поэтому запрос
 * включает вызывающий. Перегенерация меняет содержимое под тем же номером: кэш этого номера
 * сбрасывает «Regenerate», а устаревшее перечитывается при каждом включении (`staleTime: 0`).
 */
export const useAnalysisWriteProposal = (runId: string, index: number, enabled: boolean) =>
  useQuery({
    queryKey: analysisWriteKeys.proposal(runId, index),
    queryFn: () => getAnalysisWriteProposal(runId, index),
    enabled,
    retry: false,
    staleTime: 0,
  });

/**
 * Старт, «продолжить», перестройка досье и действия над блоками хода (`useContentDraftActions`).
 * Запись блока пересобирает соседние предложения хода на месте (связи тем, источники шага 5:
 * `syncLinks`, `afterSourcesWrite` бэкенда): после «Accept» и «Accept all» содержимое всех
 * предложений хода перечитывается.
 */
export const useAnalysisWriteActions = (versionId: string) => {
  const queryClient = useQueryClient();
  return useContentDraftActions<AnalysisWrite, { expectedPrint?: string }>({
    versionId,
    latestKey: analysisWriteKeys.latest(versionId),
    start: (data) => startAnalysisWrite(versionId, data),
    regenerate: ({ id, index, remark }) =>
      regenerateAnalysisItem(id, index, remark ? { remark } : {}),
    accept: ({ id, index, expectedPrint }) => acceptAnalysisItem(id, index, expectedPrint),
    discardItem: ({ id, index }) => discardAnalysisItem(id, index),
    discardRun: (id) => discardAnalysisWriteRun(id),
    acceptAll: (id) => acceptAllAnalysisItems(id),
    writesKey: analysisWriteKeys.writes(versionId),
    proposalKey: analysisWriteKeys.proposal,
    afterWrite: (runId) =>
      queryClient.invalidateQueries({ queryKey: analysisWriteKeys.proposals(runId) }),
  });
};

export type AnalysisWriteActions = ReturnType<typeof useAnalysisWriteActions>;
