import { httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  CreateRightsAgentTokenRequest,
  ListRightsAgentSubmissionsParams,
  ListRightsAgentTokensParams,
  ListRightsNotificationsParams,
  RevokeRightsAgentTokenRequest,
  RightsAgentSubmission,
  RightsAgentSubmissionsListResponse,
  RightsAgentToken,
  RightsAgentTokenIssued,
  RightsAgentTokensListResponse,
  RightsNotification,
  RightsNotificationsListResponse,
  RightsNotificationsMarkAllReadResponse,
  RightsNotificationsUnreadCount,
} from '@/types/api-schema/rights-agent';

const buildTokensQuery = (params: ListRightsAgentTokensParams): string => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status) queryParams.set('status', params.status);
  return queryParams.toString();
};

const buildSubmissionsQuery = (params: ListRightsAgentSubmissionsParams): string => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status) queryParams.set('status', params.status);
  if (params.intakeId) queryParams.set('intakeId', params.intakeId);
  return queryParams.toString();
};

const buildNotificationsQuery = (params: ListRightsNotificationsParams): string => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.unreadOnly) queryParams.set('unreadOnly', 'true');
  if (params.type) queryParams.set('type', params.type);
  if (params.severity) queryParams.set('severity', params.severity);
  if (params.rightsIntakeId) queryParams.set('rightsIntakeId', params.rightsIntakeId);
  return queryParams.toString();
};

export const createRightsAgentToken = async (
  intakeId: string,
  data: CreateRightsAgentTokenRequest
): Promise<RightsAgentTokenIssued> =>
  httpPostAuth<RightsAgentTokenIssued>(`/admin/rights/intakes/${intakeId}/agent-tokens`, data, {
    requireAuth: true,
  });

export const getRightsAgentTokens = async (
  intakeId: string,
  params: ListRightsAgentTokensParams = {}
): Promise<RightsAgentTokensListResponse> =>
  httpGetAuth<RightsAgentTokensListResponse>(
    `/admin/rights/intakes/${intakeId}/agent-tokens?${buildTokensQuery(params)}`,
    { requireAuth: true }
  );

export const revokeRightsAgentToken = async (
  tokenId: string,
  data: RevokeRightsAgentTokenRequest
): Promise<RightsAgentToken> =>
  httpPostAuth<RightsAgentToken>(`/admin/rights/agent-tokens/${tokenId}/revoke`, data, {
    requireAuth: true,
  });

export const getRightsAgentSubmissions = async (
  intakeId: string,
  params: ListRightsAgentSubmissionsParams = {}
): Promise<RightsAgentSubmissionsListResponse> =>
  httpGetAuth<RightsAgentSubmissionsListResponse>(
    `/admin/rights/intakes/${intakeId}/agent-submissions?${buildSubmissionsQuery(params)}`,
    { requireAuth: true }
  );

export const getRightsAgentSubmission = async (
  submissionId: string
): Promise<RightsAgentSubmission> =>
  httpGetAuth<RightsAgentSubmission>(`/admin/rights/agent-submissions/${submissionId}`, {
    requireAuth: true,
  });

export const getRightsNotifications = async (
  params: ListRightsNotificationsParams = {}
): Promise<RightsNotificationsListResponse> =>
  httpGetAuth<RightsNotificationsListResponse>(
    `/admin/rights/notifications?${buildNotificationsQuery(params)}`,
    { requireAuth: true }
  );

export const getRightsNotificationsUnreadCount =
  async (): Promise<RightsNotificationsUnreadCount> =>
    httpGetAuth<RightsNotificationsUnreadCount>('/admin/rights/notifications/unread-count', {
      requireAuth: true,
    });

export const markRightsNotificationRead = async (id: string): Promise<RightsNotification> =>
  httpPostAuth<RightsNotification>(
    `/admin/rights/notifications/${id}/read`,
    {},
    {
      requireAuth: true,
    }
  );

export const markAllRightsNotificationsRead =
  async (): Promise<RightsNotificationsMarkAllReadResponse> =>
    httpPostAuth<RightsNotificationsMarkAllReadResponse>(
      '/admin/rights/notifications/read-all',
      {},
      { requireAuth: true }
    );
