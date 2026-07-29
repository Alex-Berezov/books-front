import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  createRightsAgentToken,
  getRightsAgentSubmission,
  getRightsAgentSubmissions,
  getRightsAgentTokens,
  getRightsNotifications,
  getRightsNotificationsUnreadCount,
  markAllRightsNotificationsRead,
  markRightsNotificationRead,
  revokeRightsAgentToken,
} from '@/api/endpoints/admin/rights-agent';
import { rightsIntakeKeys } from '@/api/hooks/useRightsIntakes';
import type {
  CreateRightsAgentTokenRequest,
  ListRightsAgentSubmissionsParams,
  ListRightsAgentTokensParams,
  ListRightsNotificationsParams,
  RevokeRightsAgentTokenRequest,
  RightsAgentSubmission,
  RightsAgentSubmissionsListResponse,
  RightsAgentToken,
  RightsAgentTokenIssued,
  RightsAgentTokensListResponse,
  RightsNotification,
  RightsNotificationsListResponse,
  RightsNotificationsMarkAllReadResponse,
  RightsNotificationsUnreadCount,
} from '@/types/api-schema/rights-agent';

export const rightsAgentKeys = {
  all: ['rights-agent'] as const,
  tokens: (intakeId: string) => [...rightsAgentKeys.all, 'tokens', intakeId] as const,
  submissions: (intakeId: string) => [...rightsAgentKeys.all, 'submissions', intakeId] as const,
  submission: (id: string) => [...rightsAgentKeys.all, 'submission', id] as const,
  notifications: (params: ListRightsNotificationsParams) =>
    [...rightsAgentKeys.all, 'notifications', params] as const,
  unreadCount: () => [...rightsAgentKeys.all, 'notifications', 'unread-count'] as const,
};

/**
 * An agent submission materializes the rights profile and moves the intake workflow status,
 * so the intake cache is invalidated alongside the agent cache.
 */
const invalidateAgentState = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: rightsAgentKeys.all });
  queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
};

export const useRightsAgentTokens = (
  intakeId: string,
  params: ListRightsAgentTokensParams = {},
  options?: Omit<UseQueryOptions<RightsAgentTokensListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsAgentTokensListResponse, Error>({
    queryKey: rightsAgentKeys.tokens(intakeId),
    queryFn: () => getRightsAgentTokens(intakeId, params),
    enabled: !!intakeId,
    ...options,
  });
};

export const useCreateRightsAgentToken = (
  intakeId: string,
  options?: UseMutationOptions<RightsAgentTokenIssued, Error, CreateRightsAgentTokenRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsAgentTokenIssued, Error, CreateRightsAgentTokenRequest>({
    mutationFn: (data) => createRightsAgentToken(intakeId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateAgentState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useRevokeRightsAgentToken = (
  options?: UseMutationOptions<
    RightsAgentToken,
    Error,
    { tokenId: string; data: RevokeRightsAgentTokenRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsAgentToken,
    Error,
    { tokenId: string; data: RevokeRightsAgentTokenRequest }
  >({
    mutationFn: ({ tokenId, data }) => revokeRightsAgentToken(tokenId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateAgentState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useRightsAgentSubmissions = (
  intakeId: string,
  params: ListRightsAgentSubmissionsParams = {},
  options?: Omit<UseQueryOptions<RightsAgentSubmissionsListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsAgentSubmissionsListResponse, Error>({
    queryKey: rightsAgentKeys.submissions(intakeId),
    queryFn: () => getRightsAgentSubmissions(intakeId, params),
    enabled: !!intakeId,
    ...options,
  });
};

export const useRightsAgentSubmission = (
  submissionId: string,
  options?: Omit<UseQueryOptions<RightsAgentSubmission, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsAgentSubmission, Error>({
    queryKey: rightsAgentKeys.submission(submissionId),
    queryFn: () => getRightsAgentSubmission(submissionId),
    enabled: !!submissionId,
    ...options,
  });
};

export const useRightsNotifications = (
  params: ListRightsNotificationsParams = {},
  options?: Omit<UseQueryOptions<RightsNotificationsListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsNotificationsListResponse, Error>({
    queryKey: rightsAgentKeys.notifications(params),
    queryFn: () => getRightsNotifications(params),
    ...options,
  });
};

export const useRightsNotificationsUnreadCount = (
  options?: Omit<UseQueryOptions<RightsNotificationsUnreadCount, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsNotificationsUnreadCount, Error>({
    queryKey: rightsAgentKeys.unreadCount(),
    queryFn: () => getRightsNotificationsUnreadCount(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    ...options,
  });
};

export const useMarkRightsNotificationRead = (
  options?: UseMutationOptions<RightsNotification, Error, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsNotification, Error, string>({
    mutationFn: (id) => markRightsNotificationRead(id),
    ...options,
    onSuccess: (...args) => {
      invalidateAgentState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useMarkAllRightsNotificationsRead = (
  options?: UseMutationOptions<RightsNotificationsMarkAllReadResponse, Error, void>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsNotificationsMarkAllReadResponse, Error, void>({
    mutationFn: () => markAllRightsNotificationsRead(),
    ...options,
    onSuccess: (...args) => {
      invalidateAgentState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};
