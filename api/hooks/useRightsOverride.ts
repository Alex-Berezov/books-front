/**
 * React Query hooks for the admin «Разрешить публикацию» decision on a book (27.09.2026).
 *
 * Решение ставится на книгу, а ответ гейта кэшируется по версии: после выдачи или отмены
 * сбрасываются ответы гейта **всех** версий, иначе панель публикации соседней версии держит
 * прежний запрет, хотя он уже снят.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  getRightsOverride,
  grantRightsOverride,
  revokeRightsOverride,
} from '@/api/endpoints/admin/rights-override';
import type { ApiError } from '@/types/api';
import type {
  GrantRightsOverrideRequest,
  RevokeRightsOverrideRequest,
  RightsPublicationOverride,
  RightsPublicationOverrideState,
} from '@/types/api-schema';
import { versionKeys } from './useBookVersions';

export const rightsOverrideKeys = {
  all: ['rights-override'] as const,
  book: (bookId: string) => [...rightsOverrideKeys.all, bookId] as const,
};

const invalidateOverrideState = (
  queryClient: ReturnType<typeof useQueryClient>,
  bookId: string
) => {
  queryClient.invalidateQueries({ queryKey: rightsOverrideKeys.book(bookId) });
  queryClient.invalidateQueries({ queryKey: versionKeys.publicationGates() });
  // Сводка прав версии (`rightsDashboard`) лежит под `details()` и несёт вердикт BLOCK/ALLOW:
  // без сброса вкладка «Права» показывает прежний вердикт при уже снятом запрете.
  queryClient.invalidateQueries({ queryKey: versionKeys.details() });
};

export const useRightsOverride = (
  bookId: string | undefined,
  options?: Omit<UseQueryOptions<RightsPublicationOverrideState, ApiError>, 'queryKey' | 'queryFn'>
) =>
  useQuery({
    queryKey: rightsOverrideKeys.book(bookId ?? ''),
    queryFn: () => getRightsOverride(bookId!),
    enabled: Boolean(bookId),
    retry: false,
    ...options,
  });

export const useGrantRightsOverride = (
  options?: UseMutationOptions<
    RightsPublicationOverride,
    ApiError,
    { bookId: string; data: GrantRightsOverrideRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, data }) => grantRightsOverride(bookId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateOverrideState(queryClient, args[1].bookId);
      options?.onSuccess?.(...args);
    },
  });
};

export const useRevokeRightsOverride = (
  options?: UseMutationOptions<
    RightsPublicationOverride,
    ApiError,
    { bookId: string; data: RevokeRightsOverrideRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, data }) => revokeRightsOverride(bookId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateOverrideState(queryClient, args[1].bookId);
      options?.onSuccess?.(...args);
    },
    onError: (...args) => {
      // 409 «решения уже нет»: кто-то отменил его раньше — показанное состояние устарело.
      invalidateOverrideState(queryClient, args[1].bookId);
      options?.onError?.(...args);
    },
  });
};
