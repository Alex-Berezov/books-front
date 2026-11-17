/**
 * React Query hooks for the world run «Write World» (F08-4b), `admin` only.
 *
 * Ход идёт фоном на бэкенде: последний ход версии перечитывается раз в несколько секунд, пока он
 * строится и его операция `active` или пока идёт перегенерация какого-то блока; пауза, отказ
 * и готовность без перегенераций — без опроса. Записи хода в мир («Accept», «Accept all»)
 * сбрасывают запросы мира версии (`invalidateBookWorld`): список и карточки вкладки World
 * перечитываются. Прямые записи — старта и перегенерации пустого блока — приходят опросом хода,
 * их ловит панель (`useWrittenBlocks`).
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptAllWorldItems,
  acceptWorldItem,
  discardWorldItem,
  discardWorldWriteRun,
  getWorldWrite,
  getWorldWriteEstimate,
  getWorldWriteProposal,
  regenerateWorldItem,
  startWorldWrite,
} from '@/api/endpoints/admin/world-write';
import type { WorldWrite, WorldWriteState } from '@/types/api-schema';
import {
  CONTENT_DRAFT_LOCAL_CODES,
  DRAFT_RUN_REFETCH_MS,
  draftRunRefetchInterval,
  worldWriteKeys,
} from './draftKeys';
import { invalidateBookWorld } from './useBookWorld';
import { useContentDraftActions } from './useContentDraftActions';

export { worldWriteKeys } from './draftKeys';

/** Пока ход пишется или перегенерирует блок, он перечитывается с этим шагом. */
export const WORLD_WRITE_REFETCH_MS = DRAFT_RUN_REFETCH_MS;

/** Перечитывать, пока ход строится с идущей операцией или идёт перегенерация; запрос упал — опрос встаёт. */
export const worldWriteRefetchInterval = (
  state: WorldWriteState | undefined,
  failed = false
): number | false => draftRunRefetchInterval(state?.draft, failed);

export const useWorldWrite = (versionId: string, enabled: boolean) =>
  useQuery({
    queryKey: worldWriteKeys.latest(versionId),
    queryFn: () => getWorldWrite(versionId),
    enabled,
    refetchInterval: (query) =>
      worldWriteRefetchInterval(query.state.data, query.state.status === 'error'),
  });

/** Оценка до старта: запрос уходит, только когда окно подтверждения открыто. */
export const useWorldWriteEstimate = (versionId: string, enabled: boolean) =>
  useQuery({
    queryKey: worldWriteKeys.estimate(versionId),
    queryFn: () => getWorldWriteEstimate(versionId),
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
export const useWorldWriteProposal = (runId: string, index: number, enabled: boolean) =>
  useQuery({
    queryKey: worldWriteKeys.proposal(runId, index),
    queryFn: () => getWorldWriteProposal(runId, index),
    enabled,
    retry: false,
    staleTime: 0,
  });

/**
 * Старт, «продолжить», перестройка досье и действия над блоками хода (`useContentDraftActions`).
 * «Accept» и «Accept all» (и при отказе) пишут в мир: сбрасываются запросы мира версии
 * и содержимое всех предложений хода — запись блока может пересобрать соседние.
 */
export const useWorldWriteActions = (versionId: string) => {
  const queryClient = useQueryClient();
  return useContentDraftActions<WorldWrite, { expectedPrint?: string }>({
    versionId,
    latestKey: worldWriteKeys.latest(versionId),
    start: (data) => startWorldWrite(versionId, data),
    regenerate: ({ id, index, remark }) => regenerateWorldItem(id, index, remark ? { remark } : {}),
    accept: ({ id, index, expectedPrint }) => acceptWorldItem(id, index, expectedPrint),
    discardItem: ({ id, index }) => discardWorldItem(id, index),
    discardRun: (id) => discardWorldWriteRun(id),
    acceptAll: (id) => acceptAllWorldItems(id),
    // Ответ «Regenerate» только ставит задачу: запись пустого блока придёт опросом хода.
    proposalKey: worldWriteKeys.proposal,
    afterWrite: (runId) => {
      invalidateBookWorld(queryClient, versionId);
      return queryClient.invalidateQueries({ queryKey: worldWriteKeys.proposals(runId) });
    },
  });
};

export type WorldWriteActions = ReturnType<typeof useWorldWriteActions>;
