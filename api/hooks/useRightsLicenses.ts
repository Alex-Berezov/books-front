import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  createRightsLicense,
  getProfileLicenseCoverage,
  getProfileLicenses,
  getRightsLicense,
  getRightsLicenses,
  getVersionLicenseCoverage,
  linkRightsLicense,
  revokeRightsLicense,
  unlinkRightsLicense,
  updateRightsLicense,
} from '@/api/endpoints/admin/rights-licenses';
import { versionKeys } from '@/api/hooks/useBookVersions';
import { rightsIntakeKeys } from '@/api/hooks/useRightsIntakes';
import type {
  CreateRightsLicenseRequest,
  LicenseCoverageResult,
  LinkRightsLicenseRequest,
  QueryRightsLicensesParams,
  RevokeRightsLicenseRequest,
  RightsLicense,
  RightsLicenseLink,
  RightsLicensesListResponse,
  UpdateRightsLicenseRequest,
} from '@/types/api-schema/rights-licenses';

export const rightsLicenseKeys = {
  all: ['rights-licenses'] as const,
  lists: () => [...rightsLicenseKeys.all, 'list'] as const,
  list: (params: QueryRightsLicensesParams) => [...rightsLicenseKeys.lists(), params] as const,
  details: () => [...rightsLicenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...rightsLicenseKeys.details(), id] as const,
  profileLicenses: (profileId: string) => [...rightsLicenseKeys.all, 'profile', profileId] as const,
  profileCoverage: (profileId: string) =>
    [...rightsLicenseKeys.all, 'profile-coverage', profileId] as const,
  versionCoverage: (versionId: string) =>
    [...rightsLicenseKeys.all, 'version-coverage', versionId] as const,
};

/**
 * A license change can move a rights profile between covered and uncovered, so the
 * profile detail and the book rights dashboard are invalidated alongside the license itself.
 */
const invalidateLicenseState = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: rightsLicenseKeys.all });
  queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
  queryClient.invalidateQueries({ queryKey: versionKeys.all });
};

export const useRightsLicenses = (
  params: QueryRightsLicensesParams = {},
  options?: Omit<UseQueryOptions<RightsLicensesListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsLicensesListResponse, Error>({
    queryKey: rightsLicenseKeys.list(params),
    queryFn: () => getRightsLicenses(params),
    ...options,
  });
};

export const useRightsLicense = (
  id: string,
  options?: Omit<UseQueryOptions<RightsLicense, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsLicense, Error>({
    queryKey: rightsLicenseKeys.detail(id),
    queryFn: () => getRightsLicense(id),
    enabled: !!id,
    ...options,
  });
};

export const useProfileLicenses = (
  profileId: string,
  options?: Omit<UseQueryOptions<RightsLicensesListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsLicensesListResponse, Error>({
    queryKey: rightsLicenseKeys.profileLicenses(profileId),
    queryFn: () => getProfileLicenses(profileId),
    enabled: !!profileId,
    ...options,
  });
};

export const useProfileLicenseCoverage = (
  profileId: string,
  options?: Omit<UseQueryOptions<LicenseCoverageResult, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<LicenseCoverageResult, Error>({
    queryKey: rightsLicenseKeys.profileCoverage(profileId),
    queryFn: () => getProfileLicenseCoverage(profileId),
    enabled: !!profileId,
    ...options,
  });
};

export const useVersionLicenseCoverage = (
  versionId: string,
  options?: Omit<UseQueryOptions<LicenseCoverageResult, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<LicenseCoverageResult, Error>({
    queryKey: rightsLicenseKeys.versionCoverage(versionId),
    queryFn: () => getVersionLicenseCoverage(versionId),
    enabled: !!versionId,
    ...options,
  });
};

export const useCreateRightsLicense = (
  options?: UseMutationOptions<RightsLicense, Error, CreateRightsLicenseRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLicense, Error, CreateRightsLicenseRequest>({
    mutationFn: createRightsLicense,
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateLicenseState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useUpdateRightsLicense = (
  options?: UseMutationOptions<
    RightsLicense,
    Error,
    { id: string; data: UpdateRightsLicenseRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLicense, Error, { id: string; data: UpdateRightsLicenseRequest }>({
    mutationFn: ({ id, data }) => updateRightsLicense(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateLicenseState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useRevokeRightsLicense = (
  options?: UseMutationOptions<
    RightsLicense,
    Error,
    { id: string; data: RevokeRightsLicenseRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLicense, Error, { id: string; data: RevokeRightsLicenseRequest }>({
    mutationFn: ({ id, data }) => revokeRightsLicense(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateLicenseState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useLinkRightsLicense = (
  options?: UseMutationOptions<
    RightsLicenseLink,
    Error,
    { id: string; data: LinkRightsLicenseRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLicenseLink, Error, { id: string; data: LinkRightsLicenseRequest }>({
    mutationFn: ({ id, data }) => linkRightsLicense(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateLicenseState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useUnlinkRightsLicense = (
  options?: UseMutationOptions<{ success: boolean }, Error, { id: string; linkId: string }>
) => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { id: string; linkId: string }>({
    mutationFn: ({ id, linkId }) => unlinkRightsLicense(id, linkId),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateLicenseState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};
