import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
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

export const getContributors = async (
  params: QueryContributorsParams = {}
): Promise<ContributorListResponse> => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.q) queryParams.set('q', params.q);
  if (params.role) queryParams.set('role', params.role);

  const endpoint = `/admin/contributors?${queryParams.toString()}`;
  return httpGetAuth<ContributorListResponse>(endpoint, { requireAuth: true });
};

export const getContributor = async (id: string): Promise<Contributor> => {
  return httpGetAuth<Contributor>(`/admin/contributors/${id}`, { requireAuth: true });
};

export const createContributor = async (
  payload: CreateContributorPayload
): Promise<Contributor> => {
  return httpPostAuth<Contributor>('/admin/contributors', payload, { requireAuth: true });
};

export const updateContributor = async (
  id: string,
  payload: UpdateContributorPayload
): Promise<Contributor> => {
  return httpPatchAuth<Contributor>(`/admin/contributors/${id}`, payload, { requireAuth: true });
};

export const deleteContributor = async (id: string): Promise<Contributor> => {
  return httpDeleteAuth<Contributor>(`/admin/contributors/${id}`, { requireAuth: true });
};

export const linkSourceEditionContributor = async (
  sourceEditionId: string,
  payload: LinkSourceEditionContributorPayload
): Promise<RightsProfileContributor> => {
  return httpPostAuth<RightsProfileContributor>(
    `/admin/source-editions/${sourceEditionId}/contributors`,
    payload,
    { requireAuth: true }
  );
};

export const unlinkSourceEditionContributor = async (
  sourceEditionId: string,
  linkId: string
): Promise<RightsProfileContributor> => {
  return httpDeleteAuth<RightsProfileContributor>(
    `/admin/source-editions/${sourceEditionId}/contributors/${linkId}`,
    { requireAuth: true }
  );
};

export const linkRightsComponentContributor = async (
  rightsComponentId: string,
  payload: LinkRightsComponentContributorPayload
): Promise<RightsProfileContributor> => {
  return httpPostAuth<RightsProfileContributor>(
    `/admin/rights-components/${rightsComponentId}/contributors`,
    payload,
    { requireAuth: true }
  );
};

export const unlinkRightsComponentContributor = async (
  rightsComponentId: string,
  linkId: string
): Promise<RightsProfileContributor> => {
  return httpDeleteAuth<RightsProfileContributor>(
    `/admin/rights-components/${rightsComponentId}/contributors/${linkId}`,
    { requireAuth: true }
  );
};
