/**
 * React Query hooks for working with users
 */

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  assignRole,
  createUser,
  deleteUser,
  getUser,
  getUsers,
  resetPassword,
  revokeRole,
  updateUser,
} from '@/api/endpoints/admin/users';
import type { UUID } from '@/types/api-schema/common';
import type {
  CreateUserRequest,
  GetUsersParams,
  UpdateUserRequest,
  User,
  UsersResponse,
} from '@/types/api-schema/user';

/**
 * Query keys for users
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: GetUsersParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: UUID) => [...userKeys.details(), id] as const,
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

/**
 * Hook for getting user details
 */
export const useUser = (
  id: UUID,
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUser(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * Hook for creating a user
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * Hook for updating a user
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: UpdateUserRequest }) => updateUser(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * Hook for deleting a user
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: UUID) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * Hook for assigning a role
 */
export const useAssignRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: UUID; role: string }) => assignRole(id, role),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * Hook for revoking a role
 */
export const useRevokeRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: UUID; role: string }) => revokeRole(id, role),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * Hook for resetting password
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ id, password }: { id: UUID; password: string }) => resetPassword(id, password),
  });
};
