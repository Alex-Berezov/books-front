import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import * as authApi from '@/api/endpoints/auth';
import { queryKeys, staleTimeConfig } from '@/lib/queryClient';
import type { ApiError } from '@/types/api';
import type { UserMeResponse, UpdateProfileRequest, UserActivity } from '@/types/api-schema';

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
 *   if (error) return <Error message={error.message} />;
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
 * Hook to fetch user's comment activities list
 */
export const useUserActivities = (
  options?: Omit<UseQueryOptions<UserActivity[], ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<UserActivity[], ApiError>({
    queryKey: ['userActivities'] as const,
    queryFn: () => authApi.getUserActivities(),
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
