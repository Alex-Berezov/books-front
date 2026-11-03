/**
 * Ключи кэша ходов из досье — заготовки Analysis (F05-11) и хода «Write Summary» (F06-3) —
 * и их общие отказы без общего тоста. Отдельным модулем: перестройка досье (`useRebuildDossier`)
 * сбрасывает оба хода, а сами хуки ходов зовут её — без кольца импортов.
 */

import { LLM_MODELS_UNAVAILABLE } from '@/api/endpoints/admin/llm';
import { localErrorCodes } from '@/lib/api/local-error-codes';
import type { ContentDraftKind } from '@/types/api-schema';

/** Отказы, которые вкладка показывает своей подписью, без общего тоста 5xx. */
export const CONTENT_DRAFT_LOCAL_CODES = localErrorCodes(['LLM_DISABLED', LLM_MODELS_UNAVAILABLE]);

export const contentDraftKeys = {
  all: ['content-draft'] as const,
  latest: (versionId: string, kind: ContentDraftKind) =>
    [...contentDraftKeys.all, 'latest', versionId, kind] as const,
  estimate: (versionId: string, kind: ContentDraftKind) =>
    [...contentDraftKeys.all, 'estimate', versionId, kind] as const,
};

export const summaryWriteKeys = {
  all: ['summary-write'] as const,
  latest: (versionId: string) => [...summaryWriteKeys.all, 'latest', versionId] as const,
  estimate: (versionId: string) => [...summaryWriteKeys.all, 'estimate', versionId] as const,
};
