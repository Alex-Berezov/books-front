import { httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
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

const buildLawyersQuery = (params: ListLawyersParams): string => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.q) queryParams.set('q', params.q);
  if (params.lawyerType) queryParams.set('lawyerType', params.lawyerType);
  if (params.isActive !== undefined) queryParams.set('isActive', String(params.isActive));
  if (params.jurisdictionCode) queryParams.set('jurisdictionCode', params.jurisdictionCode);
  return queryParams.toString();
};

const buildReviewsQuery = (params: ListLawyerReviewsParams): string => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status) queryParams.set('status', params.status);
  if (params.trigger) queryParams.set('trigger', params.trigger);
  if (params.riskLevel) queryParams.set('riskLevel', params.riskLevel);
  if (params.decision) queryParams.set('decision', params.decision);
  if (params.assignedLawyerId) queryParams.set('assignedLawyerId', params.assignedLawyerId);
  if (params.rightsIntakeId) queryParams.set('rightsIntakeId', params.rightsIntakeId);
  if (params.rightsProfileId) queryParams.set('rightsProfileId', params.rightsProfileId);
  if (params.bookId) queryParams.set('bookId', params.bookId);
  if (params.bookVersionId) queryParams.set('bookVersionId', params.bookVersionId);
  if (params.rightsClaimId) queryParams.set('rightsClaimId', params.rightsClaimId);
  if (params.blocksApproval !== undefined) {
    queryParams.set('blocksApproval', String(params.blocksApproval));
  }
  if (params.overdueOnly) queryParams.set('overdueOnly', 'true');
  if (params.unassignedOnly) queryParams.set('unassignedOnly', 'true');
  if (params.expiringWithinDays !== undefined) {
    queryParams.set('expiringWithinDays', String(params.expiringWithinDays));
  }
  if (params.mine) queryParams.set('mine', 'true');
  return queryParams.toString();
};

// --- Lawyers directory -----------------------------------------------------

export const getLawyers = async (
  params: ListLawyersParams = {}
): Promise<RightsLawyersListResponse> =>
  httpGetAuth<RightsLawyersListResponse>(`/admin/rights/lawyers?${buildLawyersQuery(params)}`, {
    requireAuth: true,
  });

export const getLawyer = async (id: string): Promise<RightsLawyerDetail> =>
  httpGetAuth<RightsLawyerDetail>(`/admin/rights/lawyers/${id}`, { requireAuth: true });

export const createLawyer = async (data: CreateLawyerRequest): Promise<RightsLawyerDetail> =>
  httpPostAuth<RightsLawyerDetail>('/admin/rights/lawyers', data, { requireAuth: true });

export const updateLawyer = async (
  id: string,
  data: UpdateLawyerRequest
): Promise<RightsLawyerDetail> =>
  httpPatchAuth<RightsLawyerDetail>(`/admin/rights/lawyers/${id}`, data, { requireAuth: true });

export const deactivateLawyer = async (
  id: string,
  data: ReasonRequest
): Promise<RightsLawyerDetail> =>
  httpPostAuth<RightsLawyerDetail>(`/admin/rights/lawyers/${id}/deactivate`, data, {
    requireAuth: true,
  });

export const activateLawyer = async (id: string): Promise<RightsLawyerDetail> =>
  httpPostAuth<RightsLawyerDetail>(
    `/admin/rights/lawyers/${id}/activate`,
    {},
    { requireAuth: true }
  );

// --- Legal reviews ---------------------------------------------------------

export const getLawyerReviews = async (
  params: ListLawyerReviewsParams = {}
): Promise<RightsLawyerReviewsListResponse> =>
  httpGetAuth<RightsLawyerReviewsListResponse>(
    `/admin/rights/lawyer-reviews?${buildReviewsQuery(params)}`,
    { requireAuth: true }
  );

export const getLawyerReview = async (id: string): Promise<RightsLawyerReviewDetail> =>
  httpGetAuth<RightsLawyerReviewDetail>(`/admin/rights/lawyer-reviews/${id}`, {
    requireAuth: true,
  });

export const requestLawyerReview = async (
  data: RequestLawyerReviewRequest
): Promise<RightsLawyerReviewDetail> =>
  httpPostAuth<RightsLawyerReviewDetail>('/admin/rights/lawyer-reviews', data, {
    requireAuth: true,
  });

export const assignLawyerReview = async (
  id: string,
  data: AssignLawyerReviewRequest
): Promise<RightsLawyerReviewDetail> =>
  httpPostAuth<RightsLawyerReviewDetail>(`/admin/rights/lawyer-reviews/${id}/assign`, data, {
    requireAuth: true,
  });

export const startLawyerReview = async (id: string): Promise<RightsLawyerReviewDetail> =>
  httpPostAuth<RightsLawyerReviewDetail>(
    `/admin/rights/lawyer-reviews/${id}/start`,
    {},
    { requireAuth: true }
  );

export const decideLawyerReview = async (
  id: string,
  data: DecideLawyerReviewRequest
): Promise<RightsLawyerReviewDetail> =>
  httpPostAuth<RightsLawyerReviewDetail>(`/admin/rights/lawyer-reviews/${id}/decide`, data, {
    requireAuth: true,
  });

export const withdrawLawyerReview = async (
  id: string,
  data: ReasonRequest
): Promise<RightsLawyerReviewDetail> =>
  httpPostAuth<RightsLawyerReviewDetail>(`/admin/rights/lawyer-reviews/${id}/withdraw`, data, {
    requireAuth: true,
  });

export const reopenLawyerReview = async (id: string): Promise<RightsLawyerReviewDetail> =>
  httpPostAuth<RightsLawyerReviewDetail>(
    `/admin/rights/lawyer-reviews/${id}/reopen`,
    {},
    { requireAuth: true }
  );

export const addLawyerReviewNote = async (
  id: string,
  data: AddLawyerReviewNoteRequest
): Promise<RightsLawyerReviewDetail> =>
  httpPostAuth<RightsLawyerReviewDetail>(`/admin/rights/lawyer-reviews/${id}/notes`, data, {
    requireAuth: true,
  });

// --- Legal opinions --------------------------------------------------------

export const getLegalOpinions = async (reviewId: string): Promise<RightsLegalOpinion[]> =>
  httpGetAuth<RightsLegalOpinion[]>(`/admin/rights/lawyer-reviews/${reviewId}/opinions`, {
    requireAuth: true,
  });

export const attachLegalOpinion = async (
  reviewId: string,
  data: CreateLegalOpinionRequest
): Promise<RightsLegalOpinion> =>
  httpPostAuth<RightsLegalOpinion>(`/admin/rights/lawyer-reviews/${reviewId}/opinions`, data, {
    requireAuth: true,
  });

export const archiveLegalOpinion = async (
  reviewId: string,
  opinionId: string,
  data: ReasonRequest
): Promise<RightsLegalOpinion> =>
  httpPostAuth<RightsLegalOpinion>(
    `/admin/rights/lawyer-reviews/${reviewId}/opinions/${opinionId}/archive`,
    data,
    { requireAuth: true }
  );

// --- Conditions ------------------------------------------------------------

export const addLawyerCondition = async (
  reviewId: string,
  data: LawyerConditionInput
): Promise<RightsLawyerReviewDetail> =>
  httpPostAuth<RightsLawyerReviewDetail>(
    `/admin/rights/lawyer-reviews/${reviewId}/conditions`,
    data,
    { requireAuth: true }
  );

export const satisfyLawyerCondition = async (
  reviewId: string,
  conditionId: string,
  data: SatisfyConditionRequest
): Promise<RightsLawyerReviewDetail> =>
  httpPostAuth<RightsLawyerReviewDetail>(
    `/admin/rights/lawyer-reviews/${reviewId}/conditions/${conditionId}/satisfy`,
    data,
    { requireAuth: true }
  );

export const waiveLawyerCondition = async (
  reviewId: string,
  conditionId: string,
  data: ReasonRequest
): Promise<RightsLawyerReviewDetail> =>
  httpPostAuth<RightsLawyerReviewDetail>(
    `/admin/rights/lawyer-reviews/${reviewId}/conditions/${conditionId}/waive`,
    data,
    { requireAuth: true }
  );

// --- Navigational ----------------------------------------------------------

export const getIntakeLawyerReviews = async (
  intakeId: string,
  params: ListLawyerReviewsParams = {}
): Promise<RightsLawyerReviewsListResponse> =>
  httpGetAuth<RightsLawyerReviewsListResponse>(
    `/admin/rights/intakes/${intakeId}/lawyer-reviews?${buildReviewsQuery(params)}`,
    { requireAuth: true }
  );

export const getProfileRiskAssessment = async (
  profileId: string
): Promise<RiskAssessmentSnapshot> =>
  httpGetAuth<RiskAssessmentSnapshot>(`/admin/rights/profiles/${profileId}/risk-assessment`, {
    requireAuth: true,
  });

export const requireLawyerReviewForProfile = async (
  profileId: string,
  data: RequireLawyerReviewRequest
): Promise<RightsLawyerReviewDetail> =>
  httpPostAuth<RightsLawyerReviewDetail>(
    `/admin/rights/profiles/${profileId}/require-lawyer-review`,
    data,
    { requireAuth: true }
  );

export const getVersionLawyerReview = async (versionId: string): Promise<VersionLawyerReview> =>
  httpGetAuth<VersionLawyerReview>(`/admin/versions/${versionId}/lawyer-review`, {
    requireAuth: true,
  });

export const runLawyerExpiryScan = async (): Promise<LawyerExpiryScanResult> =>
  httpPostAuth<LawyerExpiryScanResult>(
    '/admin/rights/lawyer-reviews/expiry-scan',
    {},
    { requireAuth: true }
  );
