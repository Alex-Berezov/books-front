/**
 * React Query хуки для авторизованных эндпоинтов
 *
 * Предоставляет типизированные хуки для работы с данными пользователя
 * с автоматическим кэшированием через React Query.
 */

import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import * as authApi from '@/api/endpoints/auth';
import { queryKeys, staleTimeConfig } from '@/lib/queryClient';
import type { ApiError } from '@/types/api';
import type { UserMeResponse } from '@/types/api-schema';

/**
 * Хук для получения данных текущего пользователя
 *
 * @param options - Опции React Query
 * @returns Результат запроса с данными пользователя
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
