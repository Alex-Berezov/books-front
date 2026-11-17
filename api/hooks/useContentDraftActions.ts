/**
 * Действия хода из досье — одна фабрика на «Write Summary» (F06-3), «Write Analysis» (F07-3a)
 * и «Write World» (F08-4b): старт, «Continue», «Discard run», «Regenerate», «Accept», «Discard»,
 * «Accept all» и перестройка досье. Каждый ход даёт свои вызовы ручек и ключи; общее — правило
 * перечитывания: после ответа и при отказе (409 значит, что на экране устаревшее состояние) ход
 * перечитывается, записи («Accept», «Accept all») — со своим добором (`afterWrite`).
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { resumeLlmOperation } from '@/api/endpoints/admin/llm';
import type { ApiError } from '@/types/api';
import type { ContentDraftAcceptAll, ContentDraftRun, LlmOperation } from '@/types/api-schema';
import { CONTENT_DRAFT_LOCAL_CODES } from './draftKeys';
import { useRebuildDossier } from './useRebuildDossier';

export interface DraftItemVars {
  id: string;
  index: number;
}

export interface ContentDraftActionsConfig<R, A extends object> {
  versionId: string;
  /** Ключ последнего хода версии: его перечитывают все действия. */
  latestKey: QueryKey;
  start: (data: { limitUsd?: string }) => Promise<R>;
  regenerate: (vars: DraftItemVars & { remark?: string }) => Promise<ContentDraftRun>;
  accept: (vars: DraftItemVars & A) => Promise<ContentDraftRun>;
  discardItem: (vars: DraftItemVars) => Promise<ContentDraftRun>;
  discardRun: (id: string) => Promise<ContentDraftRun>;
  acceptAll: (id: string) => Promise<ContentDraftAcceptAll>;
  /** Ключ мутаций, которые пишут в поля вкладки («Accept», «Accept all», «Regenerate»). */
  writesKey?: QueryKey;
  /** Содержимое предложения номера: «Regenerate» его сбрасывает — придёт другое. */
  proposalKey?: (runId: string, index: number) => QueryKey;
  /** После «Accept» и «Accept all» (и при отказе): что ещё перечитать — поля, предложения, мир. */
  afterWrite?: (runId: string) => unknown;
}

export const useContentDraftActions = <R, A extends object>(
  config: ContentDraftActionsConfig<R, A>
) => {
  const queryClient = useQueryClient();
  const { latestKey, writesKey, proposalKey, afterWrite } = config;
  const refresh = () => queryClient.invalidateQueries({ queryKey: latestKey });
  const writes = writesKey ? { mutationKey: writesKey } : {};
  const refreshAfterWrite = (runId: string) => Promise.all([refresh(), afterWrite?.(runId)]);

  const start = useMutation<R, ApiError, { limitUsd?: string }>({
    mutationFn: (data) => config.start(data),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    onSettled: refresh,
  });
  const resume = useMutation<LlmOperation, ApiError, { id: string; limitUsd?: string }>({
    mutationFn: ({ id, limitUsd }) => resumeLlmOperation(id, limitUsd),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    onSettled: refresh,
  });
  const discardRun = useMutation<ContentDraftRun, ApiError, string>({
    mutationFn: (id) => config.discardRun(id),
    // Отбрасывание хода записанного не трогает.
    onSettled: refresh,
  });
  const regenerate = useMutation<ContentDraftRun, ApiError, DraftItemVars & { remark?: string }>({
    ...writes,
    mutationFn: (vars) => config.regenerate(vars),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    onSettled: (_data, _error, { id, index }) => {
      // Прежнее содержимое предложения под этим номером больше не то, что придёт.
      if (proposalKey) queryClient.removeQueries({ queryKey: proposalKey(id, index) });
      return refresh();
    },
  });
  const accept = useMutation<ContentDraftRun, ApiError, DraftItemVars & A>({
    ...writes,
    mutationFn: (vars) => config.accept(vars),
    onSettled: (_data, _error, { id }) => refreshAfterWrite(id),
  });
  const discardItem = useMutation<ContentDraftRun, ApiError, DraftItemVars>({
    mutationFn: (vars) => config.discardItem(vars),
    onSettled: refresh,
  });
  const acceptAll = useMutation<ContentDraftAcceptAll, ApiError, string>({
    ...writes,
    mutationFn: (id) => config.acceptAll(id),
    onSettled: (_data, _error, id) => refreshAfterWrite(id),
  });
  const rebuildDossier = useRebuildDossier(config.versionId);
  return { start, resume, discardRun, regenerate, accept, discardItem, acceptAll, rebuildDossier };
};
