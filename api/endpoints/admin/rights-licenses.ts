import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
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

const buildLicensesQuery = (params: QueryRightsLicensesParams): string => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.q) queryParams.set('q', params.q);
  if (params.status) queryParams.set('status', params.status);
  if (params.licenseType) queryParams.set('licenseType', params.licenseType);
  if (params.territoryScope) queryParams.set('territoryScope', params.territoryScope);
  if (params.countryCode) queryParams.set('countryCode', params.countryCode);
  if (params.languageCode) queryParams.set('languageCode', params.languageCode);
  if (params.mediaFormat) queryParams.set('mediaFormat', params.mediaFormat);
  if (params.rightsProfileId) queryParams.set('rightsProfileId', params.rightsProfileId);
  if (params.bookVersionId) queryParams.set('bookVersionId', params.bookVersionId);
  if (params.expiringInDays) queryParams.set('expiringInDays', String(params.expiringInDays));
  return queryParams.toString();
};

export const getRightsLicenses = async (
  params: QueryRightsLicensesParams = {}
): Promise<RightsLicensesListResponse> => {
  const endpoint = `/admin/rights/licenses?${buildLicensesQuery(params)}`;
  return httpGetAuth<RightsLicensesListResponse>(endpoint, { requireAuth: true });
};

export const getRightsLicense = async (id: string): Promise<RightsLicense> =>
  httpGetAuth<RightsLicense>(`/admin/rights/licenses/${id}`, { requireAuth: true });

export const createRightsLicense = async (
  data: CreateRightsLicenseRequest
): Promise<RightsLicense> =>
  httpPostAuth<RightsLicense>('/admin/rights/licenses', data, { requireAuth: true });

export const updateRightsLicense = async (
  id: string,
  data: UpdateRightsLicenseRequest
): Promise<RightsLicense> =>
  httpPatchAuth<RightsLicense>(`/admin/rights/licenses/${id}`, data, { requireAuth: true });

export const revokeRightsLicense = async (
  id: string,
  data: RevokeRightsLicenseRequest
): Promise<RightsLicense> =>
  httpPostAuth<RightsLicense>(`/admin/rights/licenses/${id}/revoke`, data, { requireAuth: true });

export const linkRightsLicense = async (
  id: string,
  data: LinkRightsLicenseRequest
): Promise<RightsLicenseLink> =>
  httpPostAuth<RightsLicenseLink>(`/admin/rights/licenses/${id}/links`, data, {
    requireAuth: true,
  });

export const unlinkRightsLicense = async (
  id: string,
  linkId: string
): Promise<{ success: boolean }> =>
  httpDeleteAuth<{ success: boolean }>(`/admin/rights/licenses/${id}/links/${linkId}`, {
    requireAuth: true,
  });

export const getProfileLicenses = async (profileId: string): Promise<RightsLicensesListResponse> =>
  httpGetAuth<RightsLicensesListResponse>(`/admin/rights/profiles/${profileId}/licenses`, {
    requireAuth: true,
  });

export const getProfileLicenseCoverage = async (
  profileId: string
): Promise<LicenseCoverageResult> =>
  httpGetAuth<LicenseCoverageResult>(`/admin/rights/profiles/${profileId}/license-coverage`, {
    requireAuth: true,
  });

export const getVersionLicenseCoverage = async (
  versionId: string
): Promise<LicenseCoverageResult> =>
  httpGetAuth<LicenseCoverageResult>(`/admin/versions/${versionId}/license-coverage`, {
    requireAuth: true,
  });
