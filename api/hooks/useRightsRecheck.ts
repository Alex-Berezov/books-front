import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  applyRightsLegalChange,
  archiveRightsLegalChange,
  completeRightsRecheckTask,
  createRightsLegalChange,
  createRightsRecheckTask,
  dismissRightsRecheckTask,
  getIntakeRecheckTasks,
  getRecheckSchedule,
  getRecheckScanRuns,
  getReviewChain,
  getRightsLegalChange,
  getRightsLegalChanges,
  getRightsRecheckTask,
  getRightsRecheckTasks,
  getVersionRecheck,
  reopenRightsRecheckTask,
  runRecheckScan,
  snoozeRightsRecheckTask,
  startRightsRecheckTask,
  updateRecheckSchedule,
  updateRightsLegalChange,
} from '@/api/endpoints/admin/rights-recheck';
import { versionKeys } from '@/api/hooks/useBookVersions';
import { rightsAgentKeys } from '@/api/hooks/useRightsAgent';
import { rightsIntakeKeys } from '@/api/hooks/useRightsIntakes';
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

export const rightsRecheckKeys = {
  all: ['rights-recheck'] as const,
  tasks: (params: ListRecheckTasksParams) => [...rightsRecheckKeys.all, 'tasks', params] as const,
  task: (id: string) => [...rightsRecheckKeys.all, 'task', id] as const,
  intakeTasks: (intakeId: string) => [...rightsRecheckKeys.all, 'intake-tasks', intakeId] as const,
  schedule: (profileId: string) => [...rightsRecheckKeys.all, 'schedule', profileId] as const,
  versionRecheck: (versionId: string) => [...rightsRecheckKeys.all, 'version', versionId] as const,
  reviewChain: (intakeId: string) => [...rightsRecheckKeys.all, 'review-chain', intakeId] as const,
  scanRuns: (params: ListScanRunsParams) =>
    [...rightsRecheckKeys.all, 'scan-runs', params] as const,
  legalChanges: (params: ListLegalChangesParams) =>
    [...rightsRecheckKeys.all, 'legal-changes', params] as const,
  legalChange: (id: string) => [...rightsRecheckKeys.all, 'legal-change', id] as const,
};

/**
 * Every recheck mutation may create or close a task, which changes the notification counter,
 * the intake workflow view and the version rights dashboard / publication gate.
 */
const invalidateRecheckState = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: rightsRecheckKeys.all });
  queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
  queryClient.invalidateQueries({ queryKey: rightsAgentKeys.all });
  queryClient.invalidateQueries({ queryKey: versionKeys.all });
};

export const useRightsRecheckTasks = (
  params: ListRecheckTasksParams = {},
  options?: Omit<UseQueryOptions<RightsRecheckTasksListResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsRecheckTasksListResponse, Error>({
    queryKey: rightsRecheckKeys.tasks(params),
    queryFn: () => getRightsRecheckTasks(params),
    ...options,
  });

export const useRightsRecheckTask = (
  taskId: string,
  options?: Omit<UseQueryOptions<RightsRecheckTaskDetail, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsRecheckTaskDetail, Error>({
    queryKey: rightsRecheckKeys.task(taskId),
    queryFn: () => getRightsRecheckTask(taskId),
    enabled: !!taskId,
    ...options,
  });

export const useIntakeRecheckTasks = (
  intakeId: string,
  params: ListRecheckTasksParams = {},
  options?: Omit<UseQueryOptions<RightsRecheckTasksListResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsRecheckTasksListResponse, Error>({
    queryKey: rightsRecheckKeys.intakeTasks(intakeId),
    queryFn: () => getIntakeRecheckTasks(intakeId, params),
    enabled: !!intakeId,
    ...options,
  });

export const useRecheckSchedule = (
  profileId: string,
  options?: Omit<UseQueryOptions<RightsRecheckScheduleWithTasks, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsRecheckScheduleWithTasks, Error>({
    queryKey: rightsRecheckKeys.schedule(profileId),
    queryFn: () => getRecheckSchedule(profileId),
    enabled: !!profileId,
    ...options,
  });

export const useVersionRecheck = (
  versionId: string,
  options?: Omit<UseQueryOptions<VersionRecheckEvaluation, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<VersionRecheckEvaluation, Error>({
    queryKey: rightsRecheckKeys.versionRecheck(versionId),
    queryFn: () => getVersionRecheck(versionId),
    enabled: !!versionId,
    ...options,
  });

export const useReviewChain = (
  intakeId: string,
  options?: Omit<UseQueryOptions<RightsReviewChainResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsReviewChainResponse, Error>({
    queryKey: rightsRecheckKeys.reviewChain(intakeId),
    queryFn: () => getReviewChain(intakeId),
    enabled: !!intakeId,
    ...options,
  });

export const useRecheckScanRuns = (
  params: ListScanRunsParams = {},
  options?: Omit<UseQueryOptions<RightsRecheckScanRunsListResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsRecheckScanRunsListResponse, Error>({
    queryKey: rightsRecheckKeys.scanRuns(params),
    queryFn: () => getRecheckScanRuns(params),
    ...options,
  });

export const useRightsLegalChanges = (
  params: ListLegalChangesParams = {},
  options?: Omit<UseQueryOptions<RightsLegalChangesListResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsLegalChangesListResponse, Error>({
    queryKey: rightsRecheckKeys.legalChanges(params),
    queryFn: () => getRightsLegalChanges(params),
    ...options,
  });

export const useRightsLegalChange = (
  id: string,
  options?: Omit<UseQueryOptions<RightsLegalChangeDetail, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsLegalChangeDetail, Error>({
    queryKey: rightsRecheckKeys.legalChange(id),
    queryFn: () => getRightsLegalChange(id),
    enabled: !!id,
    ...options,
  });

// ---------------------------------------------------------------------------
// Mutations
//
// `onSuccess: (...args)` rather than `(data, variables, context)`: the installed
// @tanstack/react-query expects four arguments and the explicit triple fails to type-check.
// ---------------------------------------------------------------------------

export const useCreateRightsRecheckTask = (
  options?: UseMutationOptions<RightsRecheckTaskDetail, Error, CreateRecheckTaskRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsRecheckTaskDetail, Error, CreateRecheckTaskRequest>({
    mutationFn: (data) => createRightsRecheckTask(data),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useStartRightsRecheckTask = (
  options?: UseMutationOptions<RightsRecheckTaskDetail, Error, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsRecheckTaskDetail, Error, string>({
    mutationFn: (taskId) => startRightsRecheckTask(taskId),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useCompleteRightsRecheckTask = (
  options?: UseMutationOptions<
    RightsRecheckTaskDetail,
    Error,
    { taskId: string; data: CompleteRecheckTaskRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsRecheckTaskDetail,
    Error,
    { taskId: string; data: CompleteRecheckTaskRequest }
  >({
    mutationFn: ({ taskId, data }) => completeRightsRecheckTask(taskId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useDismissRightsRecheckTask = (
  options?: UseMutationOptions<
    RightsRecheckTaskDetail,
    Error,
    { taskId: string; data: DismissRecheckTaskRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsRecheckTaskDetail,
    Error,
    { taskId: string; data: DismissRecheckTaskRequest }
  >({
    mutationFn: ({ taskId, data }) => dismissRightsRecheckTask(taskId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useSnoozeRightsRecheckTask = (
  options?: UseMutationOptions<
    RightsRecheckTaskDetail,
    Error,
    { taskId: string; data: SnoozeRecheckTaskRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsRecheckTaskDetail,
    Error,
    { taskId: string; data: SnoozeRecheckTaskRequest }
  >({
    mutationFn: ({ taskId, data }) => snoozeRightsRecheckTask(taskId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useReopenRightsRecheckTask = (
  options?: UseMutationOptions<RightsRecheckTaskDetail, Error, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsRecheckTaskDetail, Error, string>({
    mutationFn: (taskId) => reopenRightsRecheckTask(taskId),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useUpdateRecheckSchedule = (
  profileId: string,
  options?: UseMutationOptions<RightsRecheckScheduleWithTasks, Error, UpdateRecheckScheduleRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsRecheckScheduleWithTasks, Error, UpdateRecheckScheduleRequest>({
    mutationFn: (data) => updateRecheckSchedule(profileId, data),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useRunRecheckScan = (
  options?: UseMutationOptions<RightsRecheckScanRun, Error, void>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsRecheckScanRun, Error, void>({
    mutationFn: () => runRecheckScan(),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useCreateRightsLegalChange = (
  options?: UseMutationOptions<RightsLegalChange, Error, CreateLegalChangeRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLegalChange, Error, CreateLegalChangeRequest>({
    mutationFn: (data) => createRightsLegalChange(data),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useUpdateRightsLegalChange = (
  options?: UseMutationOptions<
    RightsLegalChange,
    Error,
    { id: string; data: UpdateLegalChangeRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLegalChange, Error, { id: string; data: UpdateLegalChangeRequest }>({
    mutationFn: ({ id, data }) => updateRightsLegalChange(id, data),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useApplyRightsLegalChange = (
  options?: UseMutationOptions<RightsLegalChangeDetail, Error, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLegalChangeDetail, Error, string>({
    mutationFn: (id) => applyRightsLegalChange(id),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};

export const useArchiveRightsLegalChange = (
  options?: UseMutationOptions<RightsLegalChange, Error, string>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsLegalChange, Error, string>({
    mutationFn: (id) => archiveRightsLegalChange(id),
    ...options,
    onSuccess: (...args) => {
      invalidateRecheckState(queryClient);
      options?.onSuccess?.(...args);
    },
  });
};
