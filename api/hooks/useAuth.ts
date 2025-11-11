/**
 * React Query hooks for authorized endpoints
 *
 * Provides typed hooks for working with user data
 * with automatic caching via React Query.
 */

import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import * as authApi from '@/api/endpoints/auth';
import { queryKeys, staleTimeConfig } from '@/lib/queryClient';
import type { ApiError } from '@/types/api';
import type { UserMeResponse } from '@/types/api-schema';

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
