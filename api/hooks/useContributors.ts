import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  createContributor,
  deleteContributor,
  getContributor,
  getContributors,
  linkRightsComponentContributor,
  linkSourceEditionContributor,
  unlinkRightsComponentContributor,
  unlinkSourceEditionContributor,
  updateContributor,
} from '@/api/endpoints/admin/contributors';
import type {
  Contributor,
  ContributorListResponse,
  CreateContributorPayload,
  LinkRightsComponentContributorPayload,
  LinkSourceEditionContributorPayload,
  QueryContributorsParams,
  RightsProfileContributor,
  UpdateContributorPayload,
} from '@/types/contributors';

export const CONTRIBUTOR_KEYS = {
  all: ['contributors'] as const,
  lists: () => [...CONTRIBUTOR_KEYS.all, 'list'] as const,
  list: (params: QueryContributorsParams) => [...CONTRIBUTOR_KEYS.lists(), params] as const,
  details: () => [...CONTRIBUTOR_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...CONTRIBUTOR_KEYS.details(), id] as const,
};

export const useContributors = (
  params: QueryContributorsParams = {},
  options?: Omit<UseQueryOptions<ContributorListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ContributorListResponse, Error>({
    queryKey: CONTRIBUTOR_KEYS.list(params),
    queryFn: () => getContributors(params),
    ...options,
  });
};

export const useContributor = (
  id: string,
  options?: Omit<UseQueryOptions<Contributor, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<Contributor, Error>({
    queryKey: CONTRIBUTOR_KEYS.detail(id),
    queryFn: () => getContributor(id),
    enabled: Boolean(id),
    ...options,
  });
};

export const useCreateContributor = (
  options?: UseMutationOptions<Contributor, Error, CreateContributorPayload>
) => {
  const queryClient = useQueryClient();
  return useMutation<Contributor, Error, CreateContributorPayload>({
    mutationFn: (payload) => createContributor(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: CONTRIBUTOR_KEYS.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useUpdateContributor = (
  options?: UseMutationOptions<
    Contributor,
    Error,
    { id: string; payload: UpdateContributorPayload }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<Contributor, Error, { id: string; payload: UpdateContributorPayload }>({
    mutationFn: ({ id, payload }) => updateContributor(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: CONTRIBUTOR_KEYS.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useDeleteContributor = (options?: UseMutationOptions<Contributor, Error, string>) => {
  const queryClient = useQueryClient();
  return useMutation<Contributor, Error, string>({
    mutationFn: (id) => deleteContributor(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: CONTRIBUTOR_KEYS.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useLinkSourceEditionContributor = (
  options?: UseMutationOptions<
    RightsProfileContributor,
    Error,
    { sourceEditionId: string; payload: LinkSourceEditionContributorPayload }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsProfileContributor,
    Error,
    { sourceEditionId: string; payload: LinkSourceEditionContributorPayload }
  >({
    mutationFn: ({ sourceEditionId, payload }) =>
      linkSourceEditionContributor(sourceEditionId, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['rights-intakes'] });
      queryClient.invalidateQueries({ queryKey: ['rights-profiles'] });
      queryClient.invalidateQueries({ queryKey: CONTRIBUTOR_KEYS.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useUnlinkSourceEditionContributor = (
  options?: UseMutationOptions<
    RightsProfileContributor,
    Error,
    { sourceEditionId: string; linkId: string }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsProfileContributor, Error, { sourceEditionId: string; linkId: string }>({
    mutationFn: ({ sourceEditionId, linkId }) =>
      unlinkSourceEditionContributor(sourceEditionId, linkId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['rights-intakes'] });
      queryClient.invalidateQueries({ queryKey: ['rights-profiles'] });
      queryClient.invalidateQueries({ queryKey: CONTRIBUTOR_KEYS.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useLinkRightsComponentContributor = (
  options?: UseMutationOptions<
    RightsProfileContributor,
    Error,
    { rightsComponentId: string; payload: LinkRightsComponentContributorPayload }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsProfileContributor,
    Error,
    { rightsComponentId: string; payload: LinkRightsComponentContributorPayload }
  >({
    mutationFn: ({ rightsComponentId, payload }) =>
      linkRightsComponentContributor(rightsComponentId, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['rights-intakes'] });
      queryClient.invalidateQueries({ queryKey: ['rights-profiles'] });
      queryClient.invalidateQueries({ queryKey: CONTRIBUTOR_KEYS.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useUnlinkRightsComponentContributor = (
  options?: UseMutationOptions<
    RightsProfileContributor,
    Error,
    { rightsComponentId: string; linkId: string }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsProfileContributor,
    Error,
    { rightsComponentId: string; linkId: string }
  >({
    mutationFn: ({ rightsComponentId, linkId }) =>
      unlinkRightsComponentContributor(rightsComponentId, linkId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['rights-intakes'] });
      queryClient.invalidateQueries({ queryKey: ['rights-profiles'] });
      queryClient.invalidateQueries({ queryKey: CONTRIBUTOR_KEYS.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};
