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
  materializeRightsReviewImport,
  getRightsProfileByIntake,
  getRightsProfile,
  approveRightsReview,
  rejectRightsReview,
  getRightsIntakeApprovals,
  createBookFromClearance,
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
  RightsProfileDetail,
  RightsApprovalDecision,
  CreateBookFromClearanceRequest,
  CreateBookFromClearanceResponse,
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
  rightsProfile: (profileId: string) =>
    [...rightsIntakeKeys.all, 'rights-profile', profileId] as const,
  currentRightsProfile: (intakeId: string) =>
    [...rightsIntakeKeys.all, 'current-rights-profile', intakeId] as const,
  rightsProfiles: (intakeId: string) =>
    [...rightsIntakeKeys.all, 'rights-profiles', intakeId] as const,
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

export const useMaterializeRightsReviewImport = (
  options?: UseMutationOptions<RightsProfileDetail, Error, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsProfileDetail, Error, string>({
    mutationFn: materializeRightsReviewImport,
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

export const useCurrentRightsProfile = (
  intakeId: string,
  options?: Omit<UseQueryOptions<RightsProfileDetail, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsProfileDetail, Error>({
    queryKey: rightsIntakeKeys.currentRightsProfile(intakeId),
    queryFn: () => getRightsProfileByIntake(intakeId, true) as Promise<RightsProfileDetail>,
    enabled: !!intakeId,
    ...options,
  });
};

export const useRightsProfile = (
  profileId: string,
  options?: Omit<UseQueryOptions<RightsProfileDetail, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsProfileDetail, Error>({
    queryKey: rightsIntakeKeys.rightsProfile(profileId),
    queryFn: () => getRightsProfile(profileId),
    enabled: !!profileId,
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

export const useApproveRightsReview = (
  options?: UseMutationOptions<
    RightsProfileDetail,
    Error,
    { intakeId: string; reviewId: string; data: { notesRu?: string } }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsProfileDetail,
    Error,
    { intakeId: string; reviewId: string; data: { notesRu?: string } }
  >({
    mutationFn: ({ intakeId, reviewId, data }) => approveRightsReview(intakeId, reviewId, data),
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

export const useRejectRightsReview = (
  options?: UseMutationOptions<
    RightsProfileDetail,
    Error,
    { intakeId: string; reviewId: string; data: { reasonRu: string } }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsProfileDetail,
    Error,
    { intakeId: string; reviewId: string; data: { reasonRu: string } }
  >({
    mutationFn: ({ intakeId, reviewId, data }) => rejectRightsReview(intakeId, reviewId, data),
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

export const useRightsIntakeApprovals = (
  intakeId: string,
  options?: Omit<UseQueryOptions<RightsApprovalDecision[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsApprovalDecision[], Error>({
    queryKey: [...rightsIntakeKeys.all, 'approvals', intakeId],
    queryFn: () => getRightsIntakeApprovals(intakeId),
    enabled: !!intakeId,
    ...options,
  });
};

export const useCreateBookFromClearance = (
  options?: UseMutationOptions<
    CreateBookFromClearanceResponse,
    Error,
    { intakeId: string; data: CreateBookFromClearanceRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateBookFromClearanceResponse,
    Error,
    { intakeId: string; data: CreateBookFromClearanceRequest }
  >({
    mutationFn: ({ intakeId, data }) => createBookFromClearance(intakeId, data),
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
