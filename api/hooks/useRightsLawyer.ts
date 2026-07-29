import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  activateLawyer,
  addLawyerCondition,
  addLawyerReviewNote,
  archiveLegalOpinion,
  assignLawyerReview,
  attachLegalOpinion,
  createLawyer,
  deactivateLawyer,
  decideLawyerReview,
  getIntakeLawyerReviews,
  getLawyer,
  getLawyerReview,
  getLawyerReviews,
  getLawyers,
  getLegalOpinions,
  getProfileRiskAssessment,
  getVersionLawyerReview,
  reopenLawyerReview,
  requestLawyerReview,
  requireLawyerReviewForProfile,
  runLawyerExpiryScan,
  satisfyLawyerCondition,
  startLawyerReview,
  updateLawyer,
  waiveLawyerCondition,
  withdrawLawyerReview,
} from '@/api/endpoints/admin/rights-lawyer';
import { versionKeys } from '@/api/hooks/useBookVersions';
import { rightsAgentKeys } from '@/api/hooks/useRightsAgent';
import { rightsIntakeKeys } from '@/api/hooks/useRightsIntakes';
import type {
  AddLawyerReviewNoteRequest,
  AssignLawyerReviewRequest,
  CreateLawyerRequest,
  CreateLegalOpinionRequest,
  DecideLawyerReviewRequest,
  LawyerConditionInput,
  LawyerExpiryScanResult,
  ListLawyerReviewsParams,
  ListLawyersParams,
  ReasonRequest,
  RequestLawyerReviewRequest,
  RequireLawyerReviewRequest,
  RightsLawyerDetail,
  RightsLawyerReviewDetail,
  RightsLawyerReviewsListResponse,
  RightsLawyersListResponse,
  RightsLegalOpinion,
  RiskAssessmentSnapshot,
  SatisfyConditionRequest,
  UpdateLawyerRequest,
  VersionLawyerReview,
} from '@/types/api-schema/rights-lawyer';

export const rightsLawyerKeys = {
  all: ['rights-lawyer'] as const,
  lawyers: (params: ListLawyersParams) => [...rightsLawyerKeys.all, 'lawyers', params] as const,
  lawyer: (id: string) => [...rightsLawyerKeys.all, 'lawyer', id] as const,
  reviews: (params: ListLawyerReviewsParams) =>
    [...rightsLawyerKeys.all, 'reviews', params] as const,
  review: (id: string) => [...rightsLawyerKeys.all, 'review', id] as const,
  intakeReviews: (intakeId: string) =>
    [...rightsLawyerKeys.all, 'intake-reviews', intakeId] as const,
  riskAssessment: (profileId: string) =>
    [...rightsLawyerKeys.all, 'risk-assessment', profileId] as const,
  versionReview: (versionId: string) => [...rightsLawyerKeys.all, 'version', versionId] as const,
  opinions: (reviewId: string) => [...rightsLawyerKeys.all, 'opinions', reviewId] as const,
};

/**
 * Every lawyer mutation can move statuses in three domains at once: the legal review itself,
 * the intake workflow (Phases 1/3/5) and the version rights dashboard / publication gate.
 * It also creates an in-app notification. Same invalidation set as `useRightsRecheck`.
 */
const invalidateLawyerState = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: rightsLawyerKeys.all });
  queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
  queryClient.invalidateQueries({ queryKey: rightsAgentKeys.all });
  queryClient.invalidateQueries({ queryKey: versionKeys.all });
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const useLawyers = (
  params: ListLawyersParams = {},
  options?: Omit<UseQueryOptions<RightsLawyersListResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsLawyersListResponse, Error>({
    queryKey: rightsLawyerKeys.lawyers(params),
    queryFn: () => getLawyers(params),
    ...options,
  });

export const useLawyer = (
  id: string,
  options?: Omit<UseQueryOptions<RightsLawyerDetail, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsLawyerDetail, Error>({
    queryKey: rightsLawyerKeys.lawyer(id),
    queryFn: () => getLawyer(id),
    enabled: !!id,
    ...options,
  });

export const useLawyerReviews = (
  params: ListLawyerReviewsParams = {},
  options?: Omit<UseQueryOptions<RightsLawyerReviewsListResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsLawyerReviewsListResponse, Error>({
    queryKey: rightsLawyerKeys.reviews(params),
    queryFn: () => getLawyerReviews(params),
    ...options,
  });

export const useLawyerReview = (
  id: string,
  options?: Omit<UseQueryOptions<RightsLawyerReviewDetail, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsLawyerReviewDetail, Error>({
    queryKey: rightsLawyerKeys.review(id),
    queryFn: () => getLawyerReview(id),
    enabled: !!id,
    ...options,
  });

export const useIntakeLawyerReviews = (
  intakeId: string,
  params: ListLawyerReviewsParams = {},
  options?: Omit<UseQueryOptions<RightsLawyerReviewsListResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsLawyerReviewsListResponse, Error>({
    queryKey: rightsLawyerKeys.intakeReviews(intakeId),
    queryFn: () => getIntakeLawyerReviews(intakeId, params),
    enabled: !!intakeId,
    ...options,
  });

export const useProfileRiskAssessment = (
  profileId: string,
  options?: Omit<UseQueryOptions<RiskAssessmentSnapshot, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RiskAssessmentSnapshot, Error>({
    queryKey: rightsLawyerKeys.riskAssessment(profileId),
    queryFn: () => getProfileRiskAssessment(profileId),
    enabled: !!profileId,
    ...options,
  });

export const useVersionLawyerReview = (
  versionId: string,
  options?: Omit<UseQueryOptions<VersionLawyerReview, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<VersionLawyerReview, Error>({
    queryKey: rightsLawyerKeys.versionReview(versionId),
    queryFn: () => getVersionLawyerReview(versionId),
    enabled: !!versionId,
    ...options,
  });

export const useLegalOpinions = (
  reviewId: string,
  options?: Omit<UseQueryOptions<RightsLegalOpinion[], Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsLegalOpinion[], Error>({
    queryKey: rightsLawyerKeys.opinions(reviewId),
    queryFn: () => getLegalOpinions(reviewId),
    enabled: !!reviewId,
    ...options,
  });

// ---------------------------------------------------------------------------
// Mutations
//
// `onSuccess: (...args)` rather than `(data, variables, context)`: the installed
// @tanstack/react-query expects four arguments and the explicit triple fails to type-check.
// ---------------------------------------------------------------------------

export const useCreateLawyer = (
  options?: UseMutationOptions<RightsLawyerDetail, Error, CreateLawyerRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLawyerDetail, Error, CreateLawyerRequest>({
    mutationFn: (data) => createLawyer(data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useUpdateLawyer = (
  options?: UseMutationOptions<RightsLawyerDetail, Error, { id: string; data: UpdateLawyerRequest }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLawyerDetail, Error, { id: string; data: UpdateLawyerRequest }>({
    mutationFn: ({ id, data }) => updateLawyer(id, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useDeactivateLawyer = (
  options?: UseMutationOptions<RightsLawyerDetail, Error, { id: string; data: ReasonRequest }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLawyerDetail, Error, { id: string; data: ReasonRequest }>({
    mutationFn: ({ id, data }) => deactivateLawyer(id, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useActivateLawyer = (
  options?: UseMutationOptions<RightsLawyerDetail, Error, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLawyerDetail, Error, string>({
    mutationFn: (id) => activateLawyer(id),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useRequestLawyerReview = (
  options?: UseMutationOptions<RightsLawyerReviewDetail, Error, RequestLawyerReviewRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLawyerReviewDetail, Error, RequestLawyerReviewRequest>({
    mutationFn: (data) => requestLawyerReview(data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useRequireLawyerReviewForProfile = (
  options?: UseMutationOptions<
    RightsLawyerReviewDetail,
    Error,
    { profileId: string; data: RequireLawyerReviewRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsLawyerReviewDetail,
    Error,
    { profileId: string; data: RequireLawyerReviewRequest }
  >({
    mutationFn: ({ profileId, data }) => requireLawyerReviewForProfile(profileId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useAssignLawyerReview = (
  options?: UseMutationOptions<
    RightsLawyerReviewDetail,
    Error,
    { id: string; data: AssignLawyerReviewRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsLawyerReviewDetail,
    Error,
    { id: string; data: AssignLawyerReviewRequest }
  >({
    mutationFn: ({ id, data }) => assignLawyerReview(id, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useStartLawyerReview = (
  options?: UseMutationOptions<RightsLawyerReviewDetail, Error, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLawyerReviewDetail, Error, string>({
    mutationFn: (id) => startLawyerReview(id),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useDecideLawyerReview = (
  options?: UseMutationOptions<
    RightsLawyerReviewDetail,
    Error,
    { id: string; data: DecideLawyerReviewRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsLawyerReviewDetail,
    Error,
    { id: string; data: DecideLawyerReviewRequest }
  >({
    mutationFn: ({ id, data }) => decideLawyerReview(id, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useWithdrawLawyerReview = (
  options?: UseMutationOptions<RightsLawyerReviewDetail, Error, { id: string; data: ReasonRequest }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLawyerReviewDetail, Error, { id: string; data: ReasonRequest }>({
    mutationFn: ({ id, data }) => withdrawLawyerReview(id, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useReopenLawyerReview = (
  options?: UseMutationOptions<RightsLawyerReviewDetail, Error, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLawyerReviewDetail, Error, string>({
    mutationFn: (id) => reopenLawyerReview(id),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useAddLawyerReviewNote = (
  options?: UseMutationOptions<
    RightsLawyerReviewDetail,
    Error,
    { id: string; data: AddLawyerReviewNoteRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsLawyerReviewDetail,
    Error,
    { id: string; data: AddLawyerReviewNoteRequest }
  >({
    mutationFn: ({ id, data }) => addLawyerReviewNote(id, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useAttachLegalOpinion = (
  options?: UseMutationOptions<
    RightsLegalOpinion,
    Error,
    { reviewId: string; data: CreateLegalOpinionRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsLegalOpinion,
    Error,
    { reviewId: string; data: CreateLegalOpinionRequest }
  >({
    mutationFn: ({ reviewId, data }) => attachLegalOpinion(reviewId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useArchiveLegalOpinion = (
  options?: UseMutationOptions<
    RightsLegalOpinion,
    Error,
    { reviewId: string; opinionId: string; data: ReasonRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsLegalOpinion,
    Error,
    { reviewId: string; opinionId: string; data: ReasonRequest }
  >({
    mutationFn: ({ reviewId, opinionId, data }) => archiveLegalOpinion(reviewId, opinionId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useAddLawyerCondition = (
  options?: UseMutationOptions<
    RightsLawyerReviewDetail,
    Error,
    { reviewId: string; data: LawyerConditionInput }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsLawyerReviewDetail,
    Error,
    { reviewId: string; data: LawyerConditionInput }
  >({
    mutationFn: ({ reviewId, data }) => addLawyerCondition(reviewId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useSatisfyLawyerCondition = (
  options?: UseMutationOptions<
    RightsLawyerReviewDetail,
    Error,
    { reviewId: string; conditionId: string; data: SatisfyConditionRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsLawyerReviewDetail,
    Error,
    { reviewId: string; conditionId: string; data: SatisfyConditionRequest }
  >({
    mutationFn: ({ reviewId, conditionId, data }) =>
      satisfyLawyerCondition(reviewId, conditionId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useWaiveLawyerCondition = (
  options?: UseMutationOptions<
    RightsLawyerReviewDetail,
    Error,
    { reviewId: string; conditionId: string; data: ReasonRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsLawyerReviewDetail,
    Error,
    { reviewId: string; conditionId: string; data: ReasonRequest }
  >({
    mutationFn: ({ reviewId, conditionId, data }) =>
      waiveLawyerCondition(reviewId, conditionId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useRunLawyerExpiryScan = (
  options?: UseMutationOptions<LawyerExpiryScanResult, Error, void>
) => {
  const queryClient = useQueryClient();
  return useMutation<LawyerExpiryScanResult, Error, void>({
    mutationFn: () => runLawyerExpiryScan(),
    ...options,
    onSuccess: (...args) => {
      invalidateLawyerState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};
