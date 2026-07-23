import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  RightsIntake,
  RightsIntakesListResponse,
  CreateRightsIntakeRequest,
  UpdateRightsIntakeRequest,
  GetRightsIntakesParams,
  RightsIntakeStatus,
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
