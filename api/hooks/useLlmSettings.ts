/**
 * React Query hooks for the admin «LLM settings» screen (F05-1s, `admin` only).
 *
 * После правки бюджета сбрасывается состояние модуля (`status` несёт потолок и лимит запуска),
 * после правки этапа — список этапов. Каталог моделей бэкенд кэширует на час, повторять запрос
 * на 503 `LLM_MODELS_UNAVAILABLE` бессмысленно — этот код у каталога не повторяется; прочие
 * сбои всех трёх запросов повторяются общей стратегией (`lib/queryClient.ts`). Этот 503 экран показывает своей
 * плашкой, общий тост 5xx на него снят (`localErrorCodes`).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import {
  getLlmModels,
  getLlmStageSettings,
  getLlmStatus,
  LLM_MODELS_UNAVAILABLE,
  updateLlmBudget,
  updateLlmStageSetting,
} from '@/api/endpoints/admin/llm';
import { localErrorCodes } from '@/lib/api/local-error-codes';
import { shouldRetry } from '@/lib/queryClient';
import { ApiError } from '@/types/api';
import type {
  LlmBudget,
  LlmStageSetting,
  LlmStageSettingsResponse,
  UpdateLlmBudgetRequest,
  UpdateLlmStageSettingRequest,
} from '@/types/api-schema';

export const llmKeys = {
  all: ['llm'] as const,
  status: () => [...llmKeys.all, 'status'] as const,
  models: () => [...llmKeys.all, 'models'] as const,
  stageSettings: () => [...llmKeys.all, 'stage-settings'] as const,
};

export const useLlmStatus = () => useQuery({ queryKey: llmKeys.status(), queryFn: getLlmStatus });

export const useLlmModels = () =>
  useQuery({
    queryKey: llmKeys.models(),
    queryFn: getLlmModels,
    // 503 каталога не повторяется: кэша нет, повтор лишь задержит плашку. Прочие сбои
    // (разовый 502, сеть) — общей стратегией.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.data?.code === LLM_MODELS_UNAVAILABLE) &&
      shouldRetry(failureCount, error),
    meta: localErrorCodes([LLM_MODELS_UNAVAILABLE]),
  });

export const useLlmStageSettings = () =>
  useQuery({ queryKey: llmKeys.stageSettings(), queryFn: getLlmStageSettings });

export const useUpdateLlmStageSetting = (
  options?: UseMutationOptions<
    LlmStageSetting,
    ApiError,
    { stage: string; data: UpdateLlmStageSettingRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stage, data }) => updateLlmStageSetting(stage, data),
    ...options,
    // После `options`: свой `meta` вызывающего не снимает пропуск общего тоста на этот 503.
    meta: { ...options?.meta, ...localErrorCodes([LLM_MODELS_UNAVAILABLE]) },
    onSuccess: (...args) => {
      // Ответ PUT — уже слитая строка этапа: кладём её в список сразу, чтобы карточка
      // перестроилась от нового `updatedAt` без окна, где кнопка снова шлёт тот же PUT.
      const [saved] = args;
      queryClient.setQueryData<LlmStageSettingsResponse>(llmKeys.stageSettings(), (list) =>
        list
          ? {
              ...list,
              items: list.items.map((item) => (item.stage === saved.stage ? saved : item)),
            }
          : list
      );
      queryClient.invalidateQueries({ queryKey: llmKeys.stageSettings() });
      options?.onSuccess?.(...args);
    },
  });
};

export const useUpdateLlmBudget = (
  options?: UseMutationOptions<LlmBudget, ApiError, UpdateLlmBudgetRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLlmBudget,
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: llmKeys.status() });
      options?.onSuccess?.(...args);
    },
  });
};
