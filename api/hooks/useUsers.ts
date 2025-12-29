/**
 * React Query hooks for working with users
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getUsers } from '@/api/endpoints/admin/users';
import type { GetUsersParams, UsersResponse } from '@/types/api-schema/user';

/**
 * Query keys for users
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: GetUsersParams) => [...userKeys.lists(), params] as const,
};

/**
 * Hook for getting users list
 */
export const useUsers = (
  params: GetUsersParams = {},
  options?: Omit<UseQueryOptions<UsersResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getUsers(params),
    ...options,
  });
};
