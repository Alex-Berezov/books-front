/**
 * React Query hooks for the pieces of a translation run (F05-7v, `admin` only): «оригинал |
 * перевод» по главе, повтор куска своей операцией `translation_retry`, правка руками.
 *
 * Повтор идёт фоном на бэкенде: куски главы перечитываются, пока у одного из них попытка
 * повтора идёт (`operationStatus: active`) или запуск переводит язык (`live`). После повтора
 * и правки устаревают ход и отчёт запуска (флаги кусков и глав, траты) и глава черновика —
 * и на ответе кнопки, и когда попытка меняется фоном.
 */

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  cancelLlmOperation,
  LLM_MODELS_UNAVAILABLE,
  resumeLlmOperation,
} from '@/api/endpoints/admin/llm';
import {
  editTranslationChunk,
  getTranslationChunks,
  retryTranslationChunk,
} from '@/api/endpoints/admin/translation';
import { localErrorCodes } from '@/lib/api/local-error-codes';
import type { ApiError } from '@/types/api';
import type {
  EditTranslationChunkRequest,
  LlmOperation,
  RetryTranslationChunkRequest,
  TranslationChunkEdited,
  TranslationChunkRetryStarted,
  TranslationChunks,
} from '@/types/api-schema';
import { chapterKeys } from './useChapters';
import { COMPARE_REFETCH_MS, LLM_DISABLED } from './useTranslationCompare';
import { translationRunKeys } from './useTranslationRun';

// Повтор с выбранной моделью сверяет её с каталогом OpenRouter: 503 каталога — плашкой формы.
const LOCAL_CODES = localErrorCodes([LLM_DISABLED, LLM_MODELS_UNAVAILABLE]);

export const translationChunkKeys = {
  all: ['translation-chunks'] as const,
  /** Префикс кусков запуска: повтор и правка сбрасывают все главы языка разом. */
  run: (runId: string) => [...translationChunkKeys.all, 'run', runId] as const,
  chapter: (runId: string, language: string, chapter: number) =>
    [...translationChunkKeys.run(runId), language, chapter] as const,
};

const retrying = (data: TranslationChunks | undefined): boolean =>
  data?.chunks.some((c) => c.retry?.operationStatus === 'active') ?? false;

/** Отпечаток попыток главы: смена любой — повтор начался, встал, применён или отказал. */
const retriesOf = (data: TranslationChunks): string =>
  data.chunks
    .map((c) => [c.id, c.retry?.operationId, c.retry?.status, c.retry?.operationStatus].join(':'))
    .join('|');

/**
 * Перечитывать, пока у куска главы идёт попытка повтора или запуск переводит язык (`live`);
 * на паузе, в итоге и после отказа запроса — без опроса.
 */
export const chunksRefetchInterval = (
  data: TranslationChunks | undefined,
  failed = false,
  live = false
): number | false => (!failed && (live || retrying(data)) ? COMPARE_REFETCH_MS : false);

const invalidateRun = (queryClient: QueryClient, runId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: translationRunKeys.detail(runId) }),
    queryClient.invalidateQueries({ queryKey: translationRunKeys.report(runId) }),
  ]);

/** Глава черновика переписана: её текст и список глав черновика у страницы версии — устарели. */
const invalidateDraft = (
  queryClient: QueryClient,
  draftVersionId: string | null,
  chapterId: string | null | undefined
) =>
  Promise.all([
    draftVersionId
      ? queryClient.invalidateQueries({ queryKey: chapterKeys.list(draftVersionId) })
      : undefined,
    chapterId
      ? queryClient.invalidateQueries({ queryKey: chapterKeys.detail(chapterId) })
      : undefined,
  ]);

export const useTranslationChunks = (
  runId: string,
  language: string,
  chapter: number | null,
  live = false,
  draftVersionId: string | null = null
) => {
  const queryClient = useQueryClient();
  const key = translationChunkKeys.chapter(runId, language, chapter ?? -1);

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const before = queryClient.getQueryData<TranslationChunks>(key);
      const data = await getTranslationChunks(runId, language, chapter as number);
      // Попытка сменилась фоном (в том числе закончилась раньше первого опроса): флаги глав
      // в отчёте, траты в ходе и текст главы черновика — уже другие.
      if (before !== undefined && retriesOf(before) !== retriesOf(data)) {
        void invalidateRun(queryClient, runId);
        void invalidateDraft(queryClient, draftVersionId, data.chapter?.chapterId);
      }
      return data;
    },
    enabled: chapter !== null,
    refetchInterval: (query) =>
      chunksRefetchInterval(query.state.data, query.state.status === 'error', live),
  });
};

/**
 * Повтор, правка и «продолжить»/«отменить» попытки повтора: после ответа — и при отказе, 409
 * значит, что на экране устаревшее состояние, — перечитываются куски, ход и отчёт запуска,
 * а после правки — и глава черновика.
 */
export const useTranslationChunkActions = (
  runId: string,
  draftVersionId: string | null = null,
  chapterId: string | null = null
) => {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: translationChunkKeys.run(runId) }),
      invalidateRun(queryClient, runId),
    ]);

  const retry = useMutation<
    TranslationChunkRetryStarted,
    ApiError,
    { chunkId: string; data: RetryTranslationChunkRequest }
  >({
    mutationFn: ({ chunkId, data }) => retryTranslationChunk(chunkId, data),
    meta: LOCAL_CODES,
    onSettled: refresh,
  });
  const edit = useMutation<
    TranslationChunkEdited,
    ApiError,
    { chunkId: string; data: EditTranslationChunkRequest }
  >({
    mutationFn: ({ chunkId, data }) => editTranslationChunk(chunkId, data),
    onSettled: () =>
      Promise.all([refresh(), invalidateDraft(queryClient, draftVersionId, chapterId)]),
  });
  // Попытка на `LIMIT_REACHED` выходит из паузы только с новым лимитом.
  const resumeRetry = useMutation<LlmOperation, ApiError, { id: string; limitUsd?: string }>({
    mutationFn: ({ id, limitUsd }) => resumeLlmOperation(id, limitUsd),
    meta: LOCAL_CODES,
    onSettled: refresh,
  });
  const cancelRetry = useMutation<LlmOperation, ApiError, string>({
    mutationFn: cancelLlmOperation,
    onSettled: refresh,
  });
  return { retry, edit, resumeRetry, cancelRetry };
};

export type TranslationChunkActions = ReturnType<typeof useTranslationChunkActions>;
