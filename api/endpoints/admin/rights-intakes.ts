import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  RightsIntake,
  RightsIntakesListResponse,
  CreateRightsIntakeRequest,
  UpdateRightsIntakeRequest,
  GetRightsIntakesParams,
  RightsIntakeStatus,
  RightsAgentManifest,
  RightsReviewImportDetail,
  RightsReviewImportsListResponse,
  CreateRightsReviewImportRequest,
  ListRightsReviewImportsParams,
  RightsProfileDetail,
  RightsProfileList,
  RightsApprovalDecision,
} from '@/types/api-schema/rights-intake';

export const getRightsIntakes = async (
  params: GetRightsIntakesParams = {}
): Promise<RightsIntakesListResponse> => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status) queryParams.set('status', params.status);
  if (params.q) queryParams.set('q', params.q);

  const endpoint = `/admin/rights/intakes?${queryParams.toString()}`;
  return httpGetAuth<RightsIntakesListResponse>(endpoint, { requireAuth: true });
};

export const getRightsIntake = async (id: string): Promise<RightsIntake> => {
  const endpoint = `/admin/rights/intakes/${id}`;
  return httpGetAuth<RightsIntake>(endpoint, { requireAuth: true });
};

export const createRightsIntake = async (
  data: CreateRightsIntakeRequest
): Promise<RightsIntake> => {
  return httpPostAuth<RightsIntake>('/admin/rights/intakes', data, { requireAuth: true });
};

export const updateRightsIntake = async (
  id: string,
  data: UpdateRightsIntakeRequest
): Promise<RightsIntake> => {
  return httpPatchAuth<RightsIntake>(`/admin/rights/intakes/${id}`, data, { requireAuth: true });
};

export const changeRightsIntakeStatus = async (
  id: string,
  status: RightsIntakeStatus
): Promise<RightsIntake> => {
  return httpPatchAuth<RightsIntake>(
    `/admin/rights/intakes/${id}/status`,
    { status },
    { requireAuth: true }
  );
};

export const archiveRightsIntake = async (id: string): Promise<RightsIntake> => {
  return httpDeleteAuth<RightsIntake>(`/admin/rights/intakes/${id}`, { requireAuth: true });
};

export const getRightsAgentManifest = async (id: string): Promise<RightsAgentManifest> => {
  return httpGetAuth<RightsAgentManifest>(`/admin/rights/intakes/${id}/agent-manifest`, {
    requireAuth: true,
  });
};

export const createRightsReviewImport = async (
  id: string,
  data: CreateRightsReviewImportRequest
): Promise<RightsReviewImportDetail> => {
  return httpPostAuth<RightsReviewImportDetail>(
    `/admin/rights/intakes/${id}/review-imports`,
    data,
    { requireAuth: true }
  );
};

export const getRightsReviewImports = async (
  intakeId: string,
  params: ListRightsReviewImportsParams = {}
): Promise<RightsReviewImportsListResponse> => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status) queryParams.set('status', params.status);

  const endpoint = `/admin/rights/intakes/${intakeId}/review-imports?${queryParams.toString()}`;
  return httpGetAuth<RightsReviewImportsListResponse>(endpoint, { requireAuth: true });
};

export const getRightsReviewImport = async (
  importId: string
): Promise<RightsReviewImportDetail> => {
  return httpGetAuth<RightsReviewImportDetail>(`/admin/rights/review-imports/${importId}`, {
    requireAuth: true,
  });
};

export const materializeRightsReviewImport = (importId: string): Promise<RightsProfileDetail> =>
  httpPostAuth<RightsProfileDetail>(
    `/admin/rights/review-imports/${importId}/materialize`,
    undefined,
    {
      requireAuth: true,
    }
  );

export const getRightsProfileByIntake = (
  intakeId: string,
  currentOnly = true
): Promise<RightsProfileDetail | RightsProfileList> =>
  httpGetAuth<RightsProfileDetail | RightsProfileList>(
    `/admin/rights/intakes/${intakeId}/rights-profile?currentOnly=${currentOnly}`,
    {
      requireAuth: true,
    }
  );

export const getRightsProfile = (profileId: string): Promise<RightsProfileDetail> =>
  httpGetAuth<RightsProfileDetail>(`/admin/rights/profiles/${profileId}`, {
    requireAuth: true,
  });

export const approveRightsReview = (
  intakeId: string,
  reviewId: string,
  data: { notesRu?: string }
): Promise<RightsProfileDetail> =>
  httpPostAuth<RightsProfileDetail>(
    `/admin/rights/intakes/${intakeId}/reviews/${reviewId}/approve`,
    data,
    { requireAuth: true }
  );

export const rejectRightsReview = (
  intakeId: string,
  reviewId: string,
  data: { reasonRu: string }
): Promise<RightsProfileDetail> =>
  httpPostAuth<RightsProfileDetail>(
    `/admin/rights/intakes/${intakeId}/reviews/${reviewId}/reject`,
    data,
    { requireAuth: true }
  );

export const getRightsIntakeApprovals = (intakeId: string): Promise<RightsApprovalDecision[]> =>
  httpGetAuth<RightsApprovalDecision[]>(`/admin/rights/intakes/${intakeId}/approvals`, {
    requireAuth: true,
  });
