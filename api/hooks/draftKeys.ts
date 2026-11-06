/**
 * Ключи кэша ходов из досье — «Write Summary» (F06-3) и «Write Analysis» (F07-3a), их общие
 * отказы без общего тоста и общие правила опроса и перегенерации. Отдельным модулем: перестройка досье (`useRebuildDossier`) сбрасывает
 * оба хода, а сами хуки ходов зовут её — без кольца импортов.
 */

import { LLM_MODELS_UNAVAILABLE } from '@/api/endpoints/admin/llm';
import { localErrorCodes } from '@/lib/api/local-error-codes';
import type { LlmOperation } from '@/types/api-schema';

/** Отказы, которые вкладка показывает своей подписью, без общего тоста 5xx. */
export const CONTENT_DRAFT_LOCAL_CODES = localErrorCodes(['LLM_DISABLED', LLM_MODELS_UNAVAILABLE]);

export const summaryWriteKeys = {
  all: ['summary-write'] as const,
  latest: (versionId: string) => [...summaryWriteKeys.all, 'latest', versionId] as const,
  estimate: (versionId: string) => [...summaryWriteKeys.all, 'estimate', versionId] as const,
};

export const analysisWriteKeys = {
  all: ['analysis-write'] as const,
  latest: (versionId: string) => [...analysisWriteKeys.all, 'latest', versionId] as const,
  estimate: (versionId: string) => [...analysisWriteKeys.all, 'estimate', versionId] as const,
  /**
   * Мутации, которые пишут в анализ версии («Accept», «Accept all», «Regenerate» пустого блока):
   * пока хоть одна в полёте, «Save analysis» закрыт.
   */
  writes: (versionId: string) => [...analysisWriteKeys.all, 'writes', versionId] as const,
  /** Содержимое предложений хода: префикс всех номеров. */
  proposals: (runId: string) => [...analysisWriteKeys.all, 'proposal', runId] as const,
  /** Содержимое предложения: ход и номер блока. */
  proposal: (runId: string, index: number) =>
    [...analysisWriteKeys.proposals(runId), index] as const,
};

/** Пока ход пишется или перегенерирует текст или блок, он перечитывается с этим шагом. */
export const DRAFT_RUN_REFETCH_MS = 4_000;

/** Что нужно правилам перегенерации: у текста пересказа и у блока анализа поля те же. */
interface RegenState {
  regenerating: boolean;
  regenOperationStatus: LlmOperation['status'] | null;
}

/** Перегенерация стоит на паузе (F06-5c): выход — «Continue», опрос её не ждёт. */
export const isRegenPaused = (item: RegenState): boolean =>
  item.regenerating && item.regenOperationStatus === 'paused';

/** Перегенерация идёт (не на паузе): «Regenerating…» и опрос хода. */
export const isRegenRunning = (item: RegenState): boolean =>
  item.regenerating && !isRegenPaused(item);

/**
 * Перечитывать, пока ход строится с идущей операцией или идёт перегенерация; запрос упал — опрос
 * встаёт. Одно правило у хода пересказа и хода анализа.
 */
export const draftRunRefetchInterval = (
  run:
    | {
        status: string;
        operation: Pick<LlmOperation, 'status'>;
        items: RegenState[];
      }
    | null
    | undefined,
  failed = false
): number | false => {
  if (failed || !run) return false;
  const writing = run.status === 'building' && run.operation.status === 'active';
  const regenerating = run.items.some(isRegenRunning);
  return writing || regenerating ? DRAFT_RUN_REFETCH_MS : false;
};
