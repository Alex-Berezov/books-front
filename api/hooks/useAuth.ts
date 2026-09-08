import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryOptions,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import * as authApi from '@/api/endpoints/auth';
import { USER_ACTIVITIES_PAGE_SIZE } from '@/lib/constants/pagination';
import { queryKeys, staleTimeConfig } from '@/lib/queryClient';
import type { ApiError } from '@/types/api';
import type {
  UserMeResponse,
  UpdateProfileRequest,
  UserActivitiesResponse,
} from '@/types/api-schema';

/**
 * Hook for getting current user data
 *
 * @param options - React Query options
 * @returns Query result with user data
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { data: user, isLoading, error } = useMe();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={toUserMessage(error)} />;
 *   if (!user) return null;
 *
 *   return (
 *     <div>
 *       <h1>{user.displayName || user.email}</h1>
 *       <p>Roles: {user.roles.join(', ')}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export const useMe = (
  options?: Omit<UseQueryOptions<UserMeResponse, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<UserMeResponse, ApiError> => {
  return useQuery<UserMeResponse, ApiError>({
    queryKey: queryKeys.me(),
    queryFn: () => authApi.getMe(),
    staleTime: staleTimeConfig.user,
    ...options,
  });
};

/**
 * Hook to update user profile cabinet details (nickname, avatar, name)
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<UserMeResponse, ApiError, UpdateProfileRequest>({
    mutationFn: (data: UpdateProfileRequest) => authApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(queryKeys.me(), updatedUser);
      queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    },
  });
};

/**
 * Hook to fetch user's comment activities page by page (`LEGACY-218`).
 *
 * ⚠️ Именно `useInfiniteQuery`, а не `useQuery` со счётчиком страницы снаружи.
 * Ручное накопление страниц в состоянии компонента давало три отказа сразу
 * (найдено ревью в этом заходе): на время дозагрузки данные текущего ключа
 * пропадали и кнопка «показать ещё» исчезала вместе со своим спиннером;
 * повторная выборка той же страницы (`refetchOnReconnect`) дописывала её
 * элементы вторым разом, ломая `key` в списке; отказ второй страницы был
 * неотличим от «активности больше нет». Здесь все три закрыты самим хуком:
 * `hasNextPage` и накопленные `pages` переживают дозагрузку, страница
 * не может попасть в список дважды, а `isError`/`refetch` доступны вызывающему.
 */
export const useUserActivities = (
  limit: number = USER_ACTIVITIES_PAGE_SIZE,
  options?: Omit<
    UseInfiniteQueryOptions<
      UserActivitiesResponse,
      ApiError,
      InfiniteData<UserActivitiesResponse>,
      readonly unknown[],
      number
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) => {
  return useInfiniteQuery({
    queryKey: ['userActivities', { limit }] as const,
    queryFn: ({ pageParam }) => authApi.getUserActivities({ page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: UserActivitiesResponse) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    staleTime: staleTimeConfig.user,
    ...options,
  });
};

/**
 * Hook to upload avatar using direct presigned flow
 */
export const useUploadAvatar = () => {
  return useMutation<string, ApiError, { file: File; onProgress?: (percent: number) => void }>({
    mutationFn: ({ file, onProgress }) => authApi.uploadAvatar(file, onProgress),
  });
};
