/**
 * React Query hooks for the illustration of a world hero (F08-11b).
 */

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { acceptWorldImage, getWorldImage, uploadWorldImage } from '@/api/endpoints/admin/bookWorld';
import { errorCode } from '@/lib/admin/request-errors';
import type { WorldImageState } from '@/types/api-schema';
import { bookWorldQueryKeys } from './useBookWorld';

/**
 * Состояние иллюстрации; ручки только `admin` — панель зовут только ему. Картинку генерирует
 * не сайт (F08-11d): опроса нет, состояние перечитывается при открытии и после «Accept».
 */
export const useWorldImage = (versionId: string, key: string) =>
  useQuery({
    queryKey: bookWorldQueryKeys.image(versionId, key),
    queryFn: () => getWorldImage(versionId, key),
    staleTime: 0,
  });

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
    // 409 «картинка сменилась» / «нечего принимать» — показать то, что есть сейчас.
    onError: (err, { versionId, key }) => rereadAfterRefusal(queryClient, err, versionId, key),
  });
};

/**
 * Перечитывание после отказа ручки картинки: состояние картинки всегда; на 409
 * `WORLD_IMAGE_ENTITY_CHANGED` (тип сущности сменился, F08-12c-2) — и карточку целиком: панель берёт
 * тип и предел из неё, ключ картинки лежит под ключом карточки.
 */
function rereadAfterRefusal(
  queryClient: QueryClient,
  error: unknown,
  versionId: string,
  key: string
): void {
  const queryKey =
    errorCode(error) === 'WORLD_IMAGE_ENTITY_CHANGED'
      ? bookWorldQueryKeys.entity(versionId, key)
      : bookWorldQueryKeys.image(versionId, key);
  void queryClient.invalidateQueries({ queryKey });
}

/** Загрузка файла: в ожидающую ячейку, принятая не трогается; состояние берётся из ответа. */
export const useUploadWorldImage = () => {
  const queryClient = useQueryClient();
  return useMutation<WorldImageState, Error, { versionId: string; key: string; file: File }>({
    mutationFn: ({ versionId, key, file }) => uploadWorldImage(versionId, key, file),
    onSuccess: async (state, { versionId, key }) => {
      await queryClient.cancelQueries({ queryKey: bookWorldQueryKeys.image(versionId, key) });
      queryClient.setQueryData(bookWorldQueryKeys.image(versionId, key), state);
    },
    // 409 «не тот герой» (роль сменили) — перечитать: панель уберёт поле загрузки и «Accept».
    onError: (err, { versionId, key }) => rereadAfterRefusal(queryClient, err, versionId, key),
  });
};
