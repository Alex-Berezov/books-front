import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  getRightsIntakes,
  getRightsIntake,
  createRightsIntake,
  updateRightsIntake,
  changeRightsIntakeStatus,
  archiveRightsIntake,
  getRightsAgentManifest,
  createRightsReviewImport,
  getRightsReviewImports,
  getRightsReviewImport,
} from '@/api/endpoints/admin/rights-intakes';
import type {
  RightsIntake,
  RightsIntakesListResponse,
  CreateRightsIntakeRequest,
  UpdateRightsIntakeRequest,
  RightsIntakeStatus,
  GetRightsIntakesParams,
  RightsAgentManifest,
  RightsReviewImportDetail,
  RightsReviewImportsListResponse,
  CreateRightsReviewImportRequest,
  ListRightsReviewImportsParams,
} from '@/types/api-schema/rights-intake';

export const rightsIntakeKeys = {
  all: ['rights-intakes'] as const,
  lists: () => [...rightsIntakeKeys.all, 'list'] as const,
  list: (params: GetRightsIntakesParams) => [...rightsIntakeKeys.lists(), params] as const,
  details: () => [...rightsIntakeKeys.all, 'detail'] as const,
  detail: (id: string) => [...rightsIntakeKeys.details(), id] as const,
  manifest: (id: string) => [...rightsIntakeKeys.all, 'manifest', id] as const,
  reviewImports: (intakeId: string) =>
    [...rightsIntakeKeys.all, 'review-imports', intakeId] as const,
  reviewImportsList: (intakeId: string, params: ListRightsReviewImportsParams) =>
    [...rightsIntakeKeys.reviewImports(intakeId), 'list', params] as const,
  reviewImportDetail: (importId: string) =>
    [...rightsIntakeKeys.all, 'review-import-detail', importId] as const,
};

export const useRightsIntakes = (
  params: GetRightsIntakesParams = {},
  options?: Omit<UseQueryOptions<RightsIntakesListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsIntakesListResponse, Error>({
    queryKey: rightsIntakeKeys.list(params),
    queryFn: () => getRightsIntakes(params),
    ...options,
  });
};

export const useRightsIntake = (
  id: string,
  options?: Omit<UseQueryOptions<RightsIntake, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsIntake, Error>({
    queryKey: rightsIntakeKeys.detail(id),
    queryFn: () => getRightsIntake(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateRightsIntake = (
  options?: UseMutationOptions<RightsIntake, Error, CreateRightsIntakeRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsIntake, Error, CreateRightsIntakeRequest>({
    mutationFn: createRightsIntake,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useUpdateRightsIntake = (
  options?: UseMutationOptions<RightsIntake, Error, { id: string; data: UpdateRightsIntakeRequest }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsIntake, Error, { id: string; data: UpdateRightsIntakeRequest }>({
    mutationFn: ({ id, data }) => updateRightsIntake(id, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useChangeRightsIntakeStatus = (
  options?: UseMutationOptions<RightsIntake, Error, { id: string; status: RightsIntakeStatus }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsIntake, Error, { id: string; status: RightsIntakeStatus }>({
    mutationFn: ({ id, status }) => changeRightsIntakeStatus(id, status),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useRightsAgentManifest = (
  id: string,
  options?: Omit<UseQueryOptions<RightsAgentManifest, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsAgentManifest, Error>({
    queryKey: rightsIntakeKeys.manifest(id),
    queryFn: () => getRightsAgentManifest(id),
    enabled: false,
    ...options,
  });
};

export const useArchiveRightsIntake = (
  options?: UseMutationOptions<RightsIntake, Error, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsIntake, Error, string>({
    mutationFn: archiveRightsIntake,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useRightsReviewImports = (
  intakeId: string,
  params: ListRightsReviewImportsParams = {},
  options?: Omit<UseQueryOptions<RightsReviewImportsListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsReviewImportsListResponse, Error>({
    queryKey: rightsIntakeKeys.reviewImportsList(intakeId, params),
    queryFn: () => getRightsReviewImports(intakeId, params),
    enabled: !!intakeId,
    ...options,
  });
};

export const useRightsReviewImport = (
  importId: string,
  options?: Omit<UseQueryOptions<RightsReviewImportDetail, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsReviewImportDetail, Error>({
    queryKey: rightsIntakeKeys.reviewImportDetail(importId),
    queryFn: () => getRightsReviewImport(importId),
    enabled: !!importId,
    ...options,
  });
};

export const useCreateRightsReviewImport = (
  intakeId: string,
  options?: UseMutationOptions<RightsReviewImportDetail, Error, CreateRightsReviewImportRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsReviewImportDetail, Error, CreateRightsReviewImportRequest>({
    mutationFn: (data) => createRightsReviewImport(intakeId, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};
