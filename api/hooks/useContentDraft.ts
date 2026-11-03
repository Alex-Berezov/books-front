/**
 * React Query hooks for the analysis draft from the dossier (F05-11), `admin` only.
 *
 * Заготовка строится фоном на бэкенде: последняя заготовка вида перечитывается раз в несколько
 * секунд, пока она строится и её операция `active`; пауза, отказ и готовность — без опроса.
 * 503 `LLM_DISABLED` и `LLM_MODELS_UNAVAILABLE` вкладка показывает своей подписью — общий тост 5xx
 * на них снят.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  discardContentDraft,
  getContentDraft,
  getContentDraftEstimate,
  startContentDraft,
} from '@/api/endpoints/admin/content-draft';
import { resumeLlmOperation } from '@/api/endpoints/admin/llm';
import type { ApiError } from '@/types/api';
import type {
  ContentDraft,
  ContentDraftState,
  LlmOperation,
  ContentDraftKind,
} from '@/types/api-schema';
import { CONTENT_DRAFT_LOCAL_CODES, contentDraftKeys } from './draftKeys';
import { useRebuildDossier } from './useRebuildDossier';

export { CONTENT_DRAFT_LOCAL_CODES, contentDraftKeys } from './draftKeys';

/** Пока заготовка строится, она перечитывается с этим шагом. */
export const CONTENT_DRAFT_REFETCH_MS = 4_000;

/** Перечитывать, пока строится и операция идёт; запрос упал — опрос встаёт. */
export const contentDraftRefetchInterval = (
  state: ContentDraftState | undefined,
  failed = false
): number | false =>
  !failed && state?.draft?.status === 'building' && state.draft.operation.status === 'active'
    ? CONTENT_DRAFT_REFETCH_MS
    : false;

export const useContentDraft = (versionId: string, kind: ContentDraftKind, enabled: boolean) =>
  useQuery({
    queryKey: contentDraftKeys.latest(versionId, kind),
    queryFn: () => getContentDraft(versionId, kind),
    enabled,
    refetchInterval: (query) =>
      contentDraftRefetchInterval(query.state.data, query.state.status === 'error'),
  });

/** Оценка до старта: запрос уходит, только когда окно подтверждения открыто. */
export const useContentDraftEstimate = (
  versionId: string,
  kind: ContentDraftKind,
  enabled: boolean
) =>
  useQuery({
    queryKey: contentDraftKeys.estimate(versionId, kind),
    queryFn: () => getContentDraftEstimate(versionId, kind),
    enabled,
    retry: false,
    staleTime: 0,
    meta: CONTENT_DRAFT_LOCAL_CODES,
  });

/**
 * Старт, «не нужна», «продолжить» операции и перестройка досье. После ответа — и при отказе:
 * 409 значит, что на экране устаревшее состояние, — заготовка вида перечитывается.
 */
export const useContentDraftActions = (versionId: string, kind: ContentDraftKind) => {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: contentDraftKeys.latest(versionId, kind) });

  const start = useMutation<ContentDraft, ApiError, { limitUsd?: string }>({
    mutationFn: (data) => startContentDraft(versionId, kind, data),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    onSettled: refresh,
  });
  const discard = useMutation<ContentDraft, ApiError, string>({
    mutationFn: discardContentDraft,
    onSettled: refresh,
  });
  const resume = useMutation<LlmOperation, ApiError, { id: string; limitUsd?: string }>({
    mutationFn: ({ id, limitUsd }) => resumeLlmOperation(id, limitUsd),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    onSettled: refresh,
  });
  const rebuildDossier = useRebuildDossier(versionId);
  return { start, discard, resume, rebuildDossier };
};

export type ContentDraftActions = ReturnType<typeof useContentDraftActions>;
