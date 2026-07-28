import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  ApplyClaimBlockRequest,
  AssignRightsClaimRequest,
  ChangeRightsClaimStatusRequest,
  CreateClaimAttachmentRequest,
  CreateRightsClaimRequest,
  LiftClaimBlockRequest,
  LinkClaimComponentRequest,
  QueryRightsClaimsParams,
  RecordClaimResponseRequest,
  RecordCounterNoticeRequest,
  ReopenRightsClaimRequest,
  ResolveRightsClaimRequest,
  RightsClaim,
  RightsClaimAccessBlock,
  RightsClaimAttachment,
  RightsClaimComponentRef,
  RightsClaimsListResponse,
  UpdateRightsClaimRequest,
} from '@/types/api-schema/rights-claims';

const buildClaimsQuery = (params: QueryRightsClaimsParams): string => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.q) queryParams.set('q', params.q);
  if (params.status) queryParams.set('status', params.status);
  if (params.claimType) queryParams.set('claimType', params.claimType);
  if (params.severity) queryParams.set('severity', params.severity);
  if (params.resolution) queryParams.set('resolution', params.resolution);
  if (params.channel) queryParams.set('channel', params.channel);
  if (params.claimantType) queryParams.set('claimantType', params.claimantType);
  if (params.assignedToUserId) queryParams.set('assignedToUserId', params.assignedToUserId);
  if (params.bookId) queryParams.set('bookId', params.bookId);
  if (params.bookVersionId) queryParams.set('bookVersionId', params.bookVersionId);
  if (params.rightsProfileId) queryParams.set('rightsProfileId', params.rightsProfileId);
  if (params.countryCode) queryParams.set('countryCode', params.countryCode);
  if (params.openOnly) queryParams.set('openOnly', 'true');
  if (params.overdueOnly) queryParams.set('overdueOnly', 'true');
  if (params.hasActiveBlock) queryParams.set('hasActiveBlock', 'true');
  if (params.deadlineWithinDays !== undefined) {
    queryParams.set('deadlineWithinDays', String(params.deadlineWithinDays));
  }
  if (params.receivedFrom) queryParams.set('receivedFrom', params.receivedFrom);
  if (params.receivedTo) queryParams.set('receivedTo', params.receivedTo);
  if (params.requiresLawyerReview) queryParams.set('requiresLawyerReview', 'true');
  return queryParams.toString();
};

export const getRightsClaims = async (
  params: QueryRightsClaimsParams = {}
): Promise<RightsClaimsListResponse> =>
  httpGetAuth<RightsClaimsListResponse>(`/admin/rights/claims?${buildClaimsQuery(params)}`, {
    requireAuth: true,
  });

export const getRightsClaim = async (id: string): Promise<RightsClaim> =>
  httpGetAuth<RightsClaim>(`/admin/rights/claims/${id}`, { requireAuth: true });

export const createRightsClaim = async (data: CreateRightsClaimRequest): Promise<RightsClaim> =>
  httpPostAuth<RightsClaim>('/admin/rights/claims', data, { requireAuth: true });

export const updateRightsClaim = async (
  id: string,
  data: UpdateRightsClaimRequest
): Promise<RightsClaim> =>
  httpPatchAuth<RightsClaim>(`/admin/rights/claims/${id}`, data, { requireAuth: true });

export const changeRightsClaimStatus = async (
  id: string,
  data: ChangeRightsClaimStatusRequest
): Promise<RightsClaim> =>
  httpPostAuth<RightsClaim>(`/admin/rights/claims/${id}/status`, data, { requireAuth: true });

export const assignRightsClaim = async (
  id: string,
  data: AssignRightsClaimRequest
): Promise<RightsClaim> =>
  httpPostAuth<RightsClaim>(`/admin/rights/claims/${id}/assign`, data, { requireAuth: true });

export const recordClaimResponse = async (
  id: string,
  data: RecordClaimResponseRequest
): Promise<RightsClaim> =>
  httpPostAuth<RightsClaim>(`/admin/rights/claims/${id}/response`, data, { requireAuth: true });

export const recordCounterNotice = async (
  id: string,
  data: RecordCounterNoticeRequest
): Promise<RightsClaim> =>
  httpPostAuth<RightsClaim>(`/admin/rights/claims/${id}/counter-notice`, data, {
    requireAuth: true,
  });

export const resolveRightsClaim = async (
  id: string,
  data: ResolveRightsClaimRequest
): Promise<RightsClaim> =>
  httpPostAuth<RightsClaim>(`/admin/rights/claims/${id}/resolve`, data, { requireAuth: true });

export const reopenRightsClaim = async (
  id: string,
  data: ReopenRightsClaimRequest
): Promise<RightsClaim> =>
  httpPostAuth<RightsClaim>(`/admin/rights/claims/${id}/reopen`, data, { requireAuth: true });

export const applyClaimBlock = async (
  id: string,
  data: ApplyClaimBlockRequest
): Promise<RightsClaimAccessBlock[]> =>
  httpPostAuth<RightsClaimAccessBlock[]>(`/admin/rights/claims/${id}/blocks`, data, {
    requireAuth: true,
  });

export const liftClaimBlock = async (
  id: string,
  blockId: string,
  data: LiftClaimBlockRequest
): Promise<RightsClaimAccessBlock> =>
  httpPostAuth<RightsClaimAccessBlock>(`/admin/rights/claims/${id}/blocks/${blockId}/lift`, data, {
    requireAuth: true,
  });

export const linkClaimComponent = async (
  id: string,
  data: LinkClaimComponentRequest
): Promise<RightsClaimComponentRef> =>
  httpPostAuth<RightsClaimComponentRef>(`/admin/rights/claims/${id}/components`, data, {
    requireAuth: true,
  });

export const unlinkClaimComponent = async (
  id: string,
  claimComponentId: string
): Promise<{ success: boolean }> =>
  httpDeleteAuth<{ success: boolean }>(
    `/admin/rights/claims/${id}/components/${claimComponentId}`,
    { requireAuth: true }
  );

export const addClaimAttachment = async (
  id: string,
  data: CreateClaimAttachmentRequest
): Promise<RightsClaimAttachment> =>
  httpPostAuth<RightsClaimAttachment>(`/admin/rights/claims/${id}/attachments`, data, {
    requireAuth: true,
  });

export const removeClaimAttachment = async (
  id: string,
  attachmentId: string
): Promise<{ success: boolean }> =>
  httpDeleteAuth<{ success: boolean }>(`/admin/rights/claims/${id}/attachments/${attachmentId}`, {
    requireAuth: true,
  });

export const getVersionRightsClaims = async (
  versionId: string
): Promise<RightsClaimsListResponse> =>
  httpGetAuth<RightsClaimsListResponse>(`/admin/versions/${versionId}/rights-claims`, {
    requireAuth: true,
  });

export const getBookRightsClaims = async (bookId: string): Promise<RightsClaimsListResponse> =>
  httpGetAuth<RightsClaimsListResponse>(`/admin/books/${bookId}/rights-claims`, {
    requireAuth: true,
  });
