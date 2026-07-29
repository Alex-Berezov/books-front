import { httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  CompleteRecheckTaskRequest,
  CreateLegalChangeRequest,
  CreateRecheckTaskRequest,
  DismissRecheckTaskRequest,
  ListLegalChangesParams,
  ListRecheckTasksParams,
  ListScanRunsParams,
  RightsLegalChange,
  RightsLegalChangeDetail,
  RightsLegalChangesListResponse,
  RightsRecheckScanRun,
  RightsRecheckScanRunsListResponse,
  RightsRecheckScheduleWithTasks,
  RightsRecheckTaskDetail,
  RightsRecheckTasksListResponse,
  RightsReviewChainResponse,
  SnoozeRecheckTaskRequest,
  UpdateLegalChangeRequest,
  UpdateRecheckScheduleRequest,
  VersionRecheckEvaluation,
} from '@/types/api-schema/rights-recheck';

const buildTasksQuery = (params: ListRecheckTasksParams): string => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status) queryParams.set('status', params.status);
  if (params.reason) queryParams.set('reason', params.reason);
  if (params.severity) queryParams.set('severity', params.severity);
  if (params.source) queryParams.set('source', params.source);
  if (params.rightsIntakeId) queryParams.set('rightsIntakeId', params.rightsIntakeId);
  if (params.rightsProfileId) queryParams.set('rightsProfileId', params.rightsProfileId);
  if (params.bookId) queryParams.set('bookId', params.bookId);
  if (params.bookVersionId) queryParams.set('bookVersionId', params.bookVersionId);
  if (params.legalChangeEventId) queryParams.set('legalChangeEventId', params.legalChangeEventId);
  if (params.overdueOnly) queryParams.set('overdueOnly', 'true');
  if (params.dueWithinDays !== undefined) {
    queryParams.set('dueWithinDays', String(params.dueWithinDays));
  }
  return queryParams.toString();
};

const buildScanRunsQuery = (params: ListScanRunsParams): string => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status) queryParams.set('status', params.status);
  return queryParams.toString();
};

const buildLegalChangesQuery = (params: ListLegalChangesParams): string => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status) queryParams.set('status', params.status);
  if (params.changeType) queryParams.set('changeType', params.changeType);
  if (params.severity) queryParams.set('severity', params.severity);
  if (params.countryCode) queryParams.set('countryCode', params.countryCode);
  return queryParams.toString();
};

export const getRightsRecheckTasks = async (
  params: ListRecheckTasksParams = {}
): Promise<RightsRecheckTasksListResponse> =>
  httpGetAuth<RightsRecheckTasksListResponse>(
    `/admin/rights/recheck/tasks?${buildTasksQuery(params)}`,
    { requireAuth: true }
  );

export const getRightsRecheckTask = async (taskId: string): Promise<RightsRecheckTaskDetail> =>
  httpGetAuth<RightsRecheckTaskDetail>(`/admin/rights/recheck/tasks/${taskId}`, {
    requireAuth: true,
  });

export const createRightsRecheckTask = async (
  data: CreateRecheckTaskRequest
): Promise<RightsRecheckTaskDetail> =>
  httpPostAuth<RightsRecheckTaskDetail>('/admin/rights/recheck/tasks', data, {
    requireAuth: true,
  });

export const startRightsRecheckTask = async (taskId: string): Promise<RightsRecheckTaskDetail> =>
  httpPostAuth<RightsRecheckTaskDetail>(
    `/admin/rights/recheck/tasks/${taskId}/start`,
    {},
    { requireAuth: true }
  );

export const completeRightsRecheckTask = async (
  taskId: string,
  data: CompleteRecheckTaskRequest
): Promise<RightsRecheckTaskDetail> =>
  httpPostAuth<RightsRecheckTaskDetail>(`/admin/rights/recheck/tasks/${taskId}/complete`, data, {
    requireAuth: true,
  });

export const dismissRightsRecheckTask = async (
  taskId: string,
  data: DismissRecheckTaskRequest
): Promise<RightsRecheckTaskDetail> =>
  httpPostAuth<RightsRecheckTaskDetail>(`/admin/rights/recheck/tasks/${taskId}/dismiss`, data, {
    requireAuth: true,
  });

export const snoozeRightsRecheckTask = async (
  taskId: string,
  data: SnoozeRecheckTaskRequest
): Promise<RightsRecheckTaskDetail> =>
  httpPostAuth<RightsRecheckTaskDetail>(`/admin/rights/recheck/tasks/${taskId}/snooze`, data, {
    requireAuth: true,
  });

export const reopenRightsRecheckTask = async (taskId: string): Promise<RightsRecheckTaskDetail> =>
  httpPostAuth<RightsRecheckTaskDetail>(
    `/admin/rights/recheck/tasks/${taskId}/reopen`,
    {},
    { requireAuth: true }
  );

export const getIntakeRecheckTasks = async (
  intakeId: string,
  params: ListRecheckTasksParams = {}
): Promise<RightsRecheckTasksListResponse> =>
  httpGetAuth<RightsRecheckTasksListResponse>(
    `/admin/rights/intakes/${intakeId}/recheck-tasks?${buildTasksQuery(params)}`,
    { requireAuth: true }
  );

export const getRecheckSchedule = async (
  profileId: string
): Promise<RightsRecheckScheduleWithTasks> =>
  httpGetAuth<RightsRecheckScheduleWithTasks>(
    `/admin/rights/profiles/${profileId}/recheck-schedule`,
    { requireAuth: true }
  );

export const updateRecheckSchedule = async (
  profileId: string,
  data: UpdateRecheckScheduleRequest
): Promise<RightsRecheckScheduleWithTasks> =>
  httpPatchAuth<RightsRecheckScheduleWithTasks>(
    `/admin/rights/profiles/${profileId}/recheck-schedule`,
    data,
    { requireAuth: true }
  );

export const getVersionRecheck = async (versionId: string): Promise<VersionRecheckEvaluation> =>
  httpGetAuth<VersionRecheckEvaluation>(`/admin/versions/${versionId}/recheck`, {
    requireAuth: true,
  });

export const getReviewChain = async (intakeId: string): Promise<RightsReviewChainResponse> =>
  httpGetAuth<RightsReviewChainResponse>(`/admin/rights/intakes/${intakeId}/review-chain`, {
    requireAuth: true,
  });

export const runRecheckScan = async (): Promise<RightsRecheckScanRun> =>
  httpPostAuth<RightsRecheckScanRun>('/admin/rights/recheck/scan', {}, { requireAuth: true });

export const getRecheckScanRuns = async (
  params: ListScanRunsParams = {}
): Promise<RightsRecheckScanRunsListResponse> =>
  httpGetAuth<RightsRecheckScanRunsListResponse>(
    `/admin/rights/recheck/scan-runs?${buildScanRunsQuery(params)}`,
    { requireAuth: true }
  );

export const getRightsLegalChanges = async (
  params: ListLegalChangesParams = {}
): Promise<RightsLegalChangesListResponse> =>
  httpGetAuth<RightsLegalChangesListResponse>(
    `/admin/rights/legal-changes?${buildLegalChangesQuery(params)}`,
    { requireAuth: true }
  );

export const createRightsLegalChange = async (
  data: CreateLegalChangeRequest
): Promise<RightsLegalChange> =>
  httpPostAuth<RightsLegalChange>('/admin/rights/legal-changes', data, { requireAuth: true });

export const getRightsLegalChange = async (id: string): Promise<RightsLegalChangeDetail> =>
  httpGetAuth<RightsLegalChangeDetail>(`/admin/rights/legal-changes/${id}`, { requireAuth: true });

export const updateRightsLegalChange = async (
  id: string,
  data: UpdateLegalChangeRequest
): Promise<RightsLegalChange> =>
  httpPatchAuth<RightsLegalChange>(`/admin/rights/legal-changes/${id}`, data, {
    requireAuth: true,
  });

export const applyRightsLegalChange = async (id: string): Promise<RightsLegalChangeDetail> =>
  httpPostAuth<RightsLegalChangeDetail>(
    `/admin/rights/legal-changes/${id}/apply`,
    {},
    { requireAuth: true }
  );

export const archiveRightsLegalChange = async (id: string): Promise<RightsLegalChange> =>
  httpPostAuth<RightsLegalChange>(
    `/admin/rights/legal-changes/${id}/archive`,
    {},
    { requireAuth: true }
  );
