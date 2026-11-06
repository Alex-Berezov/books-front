/**
 * React Query hooks for the analysis run «Write Analysis» (F07-3a), `admin` only.
 *
 * Ход идёт фоном на бэкенде: последний ход версии перечитывается раз в несколько секунд, пока он
 * строится и его операция `active` или пока идёт перегенерация какого-то блока; пауза, отказ
 * и готовность без перегенераций — без опроса. Форму анализа после записей хода («Accept»,
 * «Accept all», прямые записи) перечитывает вкладка сама (`onBlocksWritten`): второго запроса
 * того же анализа хуки не шлют.
 */

import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { resumeLlmOperation } from '@/api/endpoints/admin/llm';
import type { ApiError } from '@/types/api';
import type {
  AnalysisWrite,
  AnalysisWriteState,
  ContentDraftAcceptAll,
  ContentDraftRun,
  LlmOperation,
} from '@/types/api-schema';
import {
  analysisWriteKeys,
  CONTENT_DRAFT_LOCAL_CODES,
  DRAFT_RUN_REFETCH_MS,
  draftRunRefetchInterval,
} from './draftKeys';
import { useRebuildDossier } from './useRebuildDossier';

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

interface ItemVars {
  id: string;
  index: number;
}

/**
 * Старт, «продолжить», перестройка досье и действия над блоками хода. После ответа — и при отказе:
 * 409 значит, что на экране устаревшее состояние, — ход перечитывается.
 */
export const useAnalysisWriteActions = (versionId: string) => {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: analysisWriteKeys.latest(versionId) });

  const start = useMutation<AnalysisWrite, ApiError, { limitUsd?: string }>({
    mutationFn: (data) => startAnalysisWrite(versionId, data),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    onSettled: refresh,
  });
  const resume = useMutation<LlmOperation, ApiError, { id: string; limitUsd?: string }>({
    mutationFn: ({ id, limitUsd }) => resumeLlmOperation(id, limitUsd),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    onSettled: refresh,
  });
  const discardRun = useMutation<ContentDraftRun, ApiError, string>({
    mutationFn: (id) => discardAnalysisWriteRun(id),
    // Отбрасывание хода блоков не трогает.
    onSettled: refresh,
  });
  const regenerate = useMutation<ContentDraftRun, ApiError, ItemVars & { remark?: string }>({
    mutationKey: analysisWriteKeys.writes(versionId),
    mutationFn: ({ id, index, remark }) =>
      regenerateAnalysisItem(id, index, remark ? { remark } : {}),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    onSettled: (_data, _error, { id, index }) => {
      // Прежнее содержимое предложения под этим номером больше не то, что придёт.
      queryClient.removeQueries({ queryKey: analysisWriteKeys.proposal(id, index) });
      return refresh();
    },
  });
  /**
   * Запись блока пересобирает соседние предложения хода на месте (связи тем, источники шага 5:
   * `syncLinks`, `afterSourcesWrite` бэкенда): содержимое всех предложений хода перечитывается.
   */
  const refreshWithProposals = (runId: string) =>
    Promise.all([
      refresh(),
      queryClient.invalidateQueries({ queryKey: analysisWriteKeys.proposals(runId) }),
    ]);
  const accept = useMutation<ContentDraftRun, ApiError, ItemVars>({
    mutationKey: analysisWriteKeys.writes(versionId),
    mutationFn: ({ id, index }) => acceptAnalysisItem(id, index),
    onSettled: (_data, _error, { id }) => refreshWithProposals(id),
  });
  const discardItem = useMutation<ContentDraftRun, ApiError, ItemVars>({
    mutationFn: ({ id, index }) => discardAnalysisItem(id, index),
    onSettled: refresh,
  });
  const acceptAll = useMutation<ContentDraftAcceptAll, ApiError, string>({
    mutationKey: analysisWriteKeys.writes(versionId),
    mutationFn: (id) => acceptAllAnalysisItems(id),
    onSettled: (_data, _error, id) => refreshWithProposals(id),
  });
  const rebuildDossier = useRebuildDossier(versionId);
  return { start, resume, discardRun, regenerate, accept, discardItem, acceptAll, rebuildDossier };
};

export type AnalysisWriteActions = ReturnType<typeof useAnalysisWriteActions>;
