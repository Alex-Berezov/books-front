/**
 * React Query hooks for the summary (F05-10) and analysis (F05-11) drafts from the dossier, `admin` only.
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
  markContentDraftSectionAdded,
  startContentDraft,
} from '@/api/endpoints/admin/content-draft';
import { LLM_MODELS_UNAVAILABLE, resumeLlmOperation } from '@/api/endpoints/admin/llm';
import { buildDossier } from '@/api/endpoints/admin/translation';
import { localErrorCodes } from '@/lib/api/local-error-codes';
import type { ApiError } from '@/types/api';
import type {
  ContentDraft,
  ContentDraftState,
  DossierStatus,
  LlmOperation,
  ContentDraftKind,
} from '@/types/api-schema';
import { dossierKeys } from './useDossier';

/** Пока заготовка строится, она перечитывается с этим шагом. */
export const CONTENT_DRAFT_REFETCH_MS = 4_000;

/** Отказы, которые вкладка показывает своей подписью, без общего тоста 5xx. */
export const CONTENT_DRAFT_LOCAL_CODES = localErrorCodes(['LLM_DISABLED', LLM_MODELS_UNAVAILABLE]);

export const contentDraftKeys = {
  all: ['content-draft'] as const,
  latest: (versionId: string, kind: ContentDraftKind) =>
    [...contentDraftKeys.all, 'latest', versionId, kind] as const,
  estimate: (versionId: string, kind: ContentDraftKind) =>
    [...contentDraftKeys.all, 'estimate', versionId, kind] as const,
};

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
  const markAdded = useMutation<ContentDraft, ApiError, { id: string; sectionNumber: number }>({
    mutationFn: ({ id, sectionNumber }) => markContentDraftSectionAdded(id, sectionNumber),
    onSettled: refresh,
  });
  const rebuildDossier = useMutation<DossierStatus, ApiError, void>({
    mutationFn: () => buildDossier(versionId),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    // Отказ оценки `DOSSIER_STALE` лежит в кэше выключенного запроса: сброс, а не пометка
    // устаревшим, - иначе после перемонтирования вкладки «Rebuild dossier» вернулся бы.
    onSuccess: () =>
      queryClient.removeQueries({ queryKey: [...contentDraftKeys.all, 'estimate', versionId] }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: contentDraftKeys.all }),
        queryClient.invalidateQueries({ queryKey: dossierKeys.version(versionId) }),
        queryClient.invalidateQueries({ queryKey: dossierKeys.estimate(versionId) }),
      ]),
  });
  return { start, discard, resume, markAdded, rebuildDossier };
};

export type ContentDraftActions = ReturnType<typeof useContentDraftActions>;
