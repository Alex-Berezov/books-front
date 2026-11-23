/**
 * React Query hooks for the illustration of a world hero (F08-11b).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptWorldImage,
  generateWorldImage,
  getWorldImage,
} from '@/api/endpoints/admin/bookWorld';
import type { WorldImageState } from '@/types/api-schema';
import { bookWorldQueryKeys } from './useBookWorld';

/** Пока генерация идёт, состояние перечитывается с этим шагом. */
const WORLD_IMAGE_POLL_MS = 3000;

/** Идёт ли генерация: пока да, вкладка опрашивает ручку состояния и не даёт начать вторую. */
export const isWorldImageRunning = (state: WorldImageState | undefined) =>
  state?.generation?.status === 'active';

/**
 * Состояние иллюстрации; ручки только `admin` — панель зовут только ему. Отказ перечитывания
 * останавливает опрос: панель показывает его с «Retry», а не стучит в ручку каждые 3 с.
 */
export const useWorldImage = (versionId: string, key: string) =>
  useQuery({
    queryKey: bookWorldQueryKeys.image(versionId, key),
    queryFn: () => getWorldImage(versionId, key),
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.status !== 'error' && isWorldImageRunning(query.state.data)
        ? WORLD_IMAGE_POLL_MS
        : false,
  });

/** «Generate»/«Regenerate»: ответ 202 несёт новое состояние — идущую генерацию. */
export const useGenerateWorldImage = () => {
  const queryClient = useQueryClient();
  return useMutation<WorldImageState, Error, { versionId: string; key: string }>({
    mutationFn: ({ versionId, key }) => generateWorldImage(versionId, key),
    // Перечитывание, ушедшее до нажатия, не затирает идущую генерацию из ответа 202.
    onSuccess: async (state, { versionId, key }) => {
      await queryClient.cancelQueries({ queryKey: bookWorldQueryKeys.image(versionId, key) });
      queryClient.setQueryData(bookWorldQueryKeys.image(versionId, key), state);
    },
    // Отказ (409 «уже идёт», «нет описания») — состояние могло сдвинуться: перечитать.
    onError: (_err, { versionId, key }) => {
      void queryClient.invalidateQueries({ queryKey: bookWorldQueryKeys.image(versionId, key) });
    },
  });
};

/** «Accept»: принятая картинка заменяет прежнюю, карточка сущности (`image`) перечитывается. */
export const useAcceptWorldImage = () => {
  const queryClient = useQueryClient();
  return useMutation<WorldImageState, Error, { versionId: string; key: string; mediaId: string }>({
    mutationFn: ({ versionId, key, mediaId }) =>
      acceptWorldImage(versionId, key, { pendingMediaId: mediaId }),
    onSuccess: async (state, { versionId, key }) => {
      await queryClient.cancelQueries({ queryKey: bookWorldQueryKeys.image(versionId, key) });
      queryClient.setQueryData(bookWorldQueryKeys.image(versionId, key), state);
      // Только сама карточка: ключ картинки лежит под ней и уже взят из ответа.
      void queryClient.invalidateQueries({
        queryKey: bookWorldQueryKeys.entity(versionId, key),
        exact: true,
      });
    },
    // 409 «перегенерирована» / «нечего принимать» — показать то, что есть сейчас.
    onError: (_err, { versionId, key }) => {
      void queryClient.invalidateQueries({ queryKey: bookWorldQueryKeys.image(versionId, key) });
    },
  });
};
