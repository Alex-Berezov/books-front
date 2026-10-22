/**
 * React Query hooks for the admin «Translation compare» screen (F05-3, `admin` only).
 *
 * Сравнение идёт фоном на бэкенде: открытое сравнение перечитывается раз в несколько секунд,
 * пока его операция `active`, и перестаёт, как только она на паузе или закончилась. 503
 * `LLM_DISABLED` и `LLM_MODELS_UNAVAILABLE` экран показывает своей плашкой — общий тост 5xx
 * на них снят (`localErrorCodes`); 4xx общий тост не показывает вовсе.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import {
  cancelLlmOperation,
  LLM_MODELS_UNAVAILABLE,
  resumeLlmOperation,
} from '@/api/endpoints/admin/llm';
import {
  getTranslationCompare,
  getTranslationCompareEstimate,
  getTranslationCompares,
  startTranslationCompare,
} from '@/api/endpoints/admin/translation';
import { localErrorCodes } from '@/lib/api/local-error-codes';
import type { ApiError } from '@/types/api';
import type {
  LlmOperation,
  StartTranslationCompareRequest,
  TranslationCompare,
  TranslationCompareParams,
} from '@/types/api-schema';

/** Код 503 запуска без ключа OpenRouter. */
export const LLM_DISABLED = 'LLM_DISABLED';

/** Пока операция идёт, колонки перечитываются с этим шагом. */
export const COMPARE_REFETCH_MS = 5_000;

export const COMPARE_MIN_MODELS = 2;
export const COMPARE_MAX_MODELS = 4;

const LOCAL_CODES = localErrorCodes([LLM_DISABLED, LLM_MODELS_UNAVAILABLE]);

export const translationCompareKeys = {
  all: ['translation-compare'] as const,
  estimate: (versionId: string, params: TranslationCompareParams) =>
    [...translationCompareKeys.all, 'estimate', versionId, params] as const,
  list: (versionId: string) => [...translationCompareKeys.all, 'list', versionId] as const,
  detail: (id: string) => [...translationCompareKeys.all, 'detail', id] as const,
};

const isComplete = (params: TranslationCompareParams | null): params is TranslationCompareParams =>
  params !== null &&
  params.chapterNumber > 0 &&
  params.targetLanguage !== '' &&
  params.models.length >= COMPARE_MIN_MODELS &&
  params.models.length <= COMPARE_MAX_MODELS;

/** Оценка до запуска: запрос уходит только с главой, языком и 2–4 моделями. */
export const useTranslationCompareEstimate = (
  versionId: string,
  params: TranslationCompareParams | null
) =>
  useQuery({
    queryKey: translationCompareKeys.estimate(
      versionId,
      params ?? { chapterNumber: 0, targetLanguage: '', models: [] }
    ),
    queryFn: () => getTranslationCompareEstimate(versionId, params as TranslationCompareParams),
    enabled: isComplete(params),
    retry: false,
    meta: LOCAL_CODES,
  });

export const useTranslationCompares = (versionId: string) =>
  useQuery({
    queryKey: translationCompareKeys.list(versionId),
    queryFn: () => getTranslationCompares(versionId),
  });

/**
 * Перечитывать, пока операция идёт; пауза, отмена и конец - без опроса. Запрос упал - опрос
 * встаёт: экран показывает отказ своей плашкой, а не общий тост на каждый цикл.
 */
export const compareRefetchInterval = (
  compare: TranslationCompare | undefined,
  failed = false
): number | false =>
  !failed && compare?.operation.status === 'active' ? COMPARE_REFETCH_MS : false;

export const useTranslationCompare = (id: string | null) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: translationCompareKeys.detail(id ?? ''),
    queryFn: async () => {
      const compare = await getTranslationCompare(id as string);
      // Опрос кончился (пауза, отмена, конец): строка в «Past compares» иначе осталась бы
      // с прежним статусом и тратой до перезагрузки страницы.
      if (compare.operation.status !== 'active') {
        void queryClient.invalidateQueries({
          queryKey: translationCompareKeys.list(compare.bookVersionId),
        });
      }
      return compare;
    },
    enabled: id !== null,
    refetchInterval: (query) =>
      compareRefetchInterval(query.state.data, query.state.status === 'error'),
  });
};

/**
 * Отмена и «продолжить» открытого сравнения (С9): после ответа сравнение перечитывается — у
 * идущего снова включается опрос, у отменённого колонки показывают `cancelled`.
 */
export const useCompareOperation = (compare: Pick<TranslationCompare, 'id' | 'bookVersionId'>) => {
  const queryClient = useQueryClient();
  // И при отказе: 409 «уже закончилась» значит, что на экране устаревшее состояние.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: translationCompareKeys.detail(compare.id) }),
      queryClient.invalidateQueries({
        queryKey: translationCompareKeys.list(compare.bookVersionId),
      }),
    ]);

  const cancel = useMutation<LlmOperation, ApiError, string>({
    mutationFn: cancelLlmOperation,
    onSettled: refresh,
  });
  const resume = useMutation<LlmOperation, ApiError, { id: string; limitUsd?: string }>({
    mutationFn: ({ id, limitUsd }) => resumeLlmOperation(id, limitUsd),
    meta: LOCAL_CODES,
    onSettled: refresh,
  });
  return { cancel, resume };
};

export const useStartTranslationCompare = (
  versionId: string,
  options?: UseMutationOptions<TranslationCompare, ApiError, StartTranslationCompareRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => startTranslationCompare(versionId, data),
    ...options,
    meta: { ...options?.meta, ...LOCAL_CODES },
    onSuccess: (...args) => {
      const [started] = args;
      queryClient.setQueryData(translationCompareKeys.detail(started.id), started);
      queryClient.invalidateQueries({ queryKey: translationCompareKeys.list(versionId) });
      // Запуск сам меняет оценку: досье и глоссарий уже строятся, их строк в ней больше нет.
      queryClient.invalidateQueries({
        queryKey: [...translationCompareKeys.all, 'estimate', versionId],
      });
      options?.onSuccess?.(...args);
    },
  });
};
