import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  addClaimAttachment,
  applyClaimBlock,
  assignRightsClaim,
  changeRightsClaimStatus,
  createRightsClaim,
  getBookRightsClaims,
  getRightsClaim,
  getRightsClaims,
  getVersionRightsClaims,
  liftClaimBlock,
  linkClaimComponent,
  recordClaimResponse,
  recordCounterNotice,
  removeClaimAttachment,
  reopenRightsClaim,
  resolveRightsClaim,
  unlinkClaimComponent,
  updateRightsClaim,
} from '@/api/endpoints/admin/rights-claims';
import { versionKeys } from '@/api/hooks/useBookVersions';
import { rightsIntakeKeys } from '@/api/hooks/useRightsIntakes';
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

export const rightsClaimKeys = {
  all: ['rights-claims'] as const,
  lists: () => [...rightsClaimKeys.all, 'list'] as const,
  list: (params: QueryRightsClaimsParams) => [...rightsClaimKeys.lists(), params] as const,
  details: () => [...rightsClaimKeys.all, 'detail'] as const,
  detail: (id: string) => [...rightsClaimKeys.details(), id] as const,
  versionClaims: (versionId: string) => [...rightsClaimKeys.all, 'version', versionId] as const,
  bookClaims: (bookId: string) => [...rightsClaimKeys.all, 'book', bookId] as const,
};

/**
 * A claim change moves both the publication gate and the rights dashboard, so the version
 * and intake caches are invalidated alongside the claim itself.
 */
const invalidateClaimState = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: rightsClaimKeys.all });
  queryClient.invalidateQueries({ queryKey: versionKeys.all });
  queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
};

export const useRightsClaims = (
  params: QueryRightsClaimsParams = {},
  options?: Omit<UseQueryOptions<RightsClaimsListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsClaimsListResponse, Error>({
    queryKey: rightsClaimKeys.list(params),
    queryFn: () => getRightsClaims(params),
    ...options,
  });
};

export const useRightsClaim = (
  id: string,
  options?: Omit<UseQueryOptions<RightsClaim, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsClaim, Error>({
    queryKey: rightsClaimKeys.detail(id),
    queryFn: () => getRightsClaim(id),
    enabled: !!id,
    ...options,
  });
};

export const useVersionRightsClaims = (
  versionId: string,
  options?: Omit<UseQueryOptions<RightsClaimsListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsClaimsListResponse, Error>({
    queryKey: rightsClaimKeys.versionClaims(versionId),
    queryFn: () => getVersionRightsClaims(versionId),
    enabled: !!versionId,
    ...options,
  });
};

export const useBookRightsClaims = (
  bookId: string,
  options?: Omit<UseQueryOptions<RightsClaimsListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RightsClaimsListResponse, Error>({
    queryKey: rightsClaimKeys.bookClaims(bookId),
    queryFn: () => getBookRightsClaims(bookId),
    enabled: !!bookId,
    ...options,
  });
};

export const useCreateRightsClaim = (
  options?: UseMutationOptions<RightsClaim, Error, CreateRightsClaimRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsClaim, Error, CreateRightsClaimRequest>({
    mutationFn: createRightsClaim,
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useUpdateRightsClaim = (
  options?: UseMutationOptions<RightsClaim, Error, { id: string; data: UpdateRightsClaimRequest }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsClaim, Error, { id: string; data: UpdateRightsClaimRequest }>({
    mutationFn: ({ id, data }) => updateRightsClaim(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useChangeRightsClaimStatus = (
  options?: UseMutationOptions<
    RightsClaim,
    Error,
    { id: string; data: ChangeRightsClaimStatusRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsClaim, Error, { id: string; data: ChangeRightsClaimStatusRequest }>({
    mutationFn: ({ id, data }) => changeRightsClaimStatus(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useAssignRightsClaim = (
  options?: UseMutationOptions<RightsClaim, Error, { id: string; data: AssignRightsClaimRequest }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsClaim, Error, { id: string; data: AssignRightsClaimRequest }>({
    mutationFn: ({ id, data }) => assignRightsClaim(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useRecordClaimResponse = (
  options?: UseMutationOptions<RightsClaim, Error, { id: string; data: RecordClaimResponseRequest }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsClaim, Error, { id: string; data: RecordClaimResponseRequest }>({
    mutationFn: ({ id, data }) => recordClaimResponse(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useRecordCounterNotice = (
  options?: UseMutationOptions<RightsClaim, Error, { id: string; data: RecordCounterNoticeRequest }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsClaim, Error, { id: string; data: RecordCounterNoticeRequest }>({
    mutationFn: ({ id, data }) => recordCounterNotice(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useResolveRightsClaim = (
  options?: UseMutationOptions<RightsClaim, Error, { id: string; data: ResolveRightsClaimRequest }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsClaim, Error, { id: string; data: ResolveRightsClaimRequest }>({
    mutationFn: ({ id, data }) => resolveRightsClaim(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useReopenRightsClaim = (
  options?: UseMutationOptions<RightsClaim, Error, { id: string; data: ReopenRightsClaimRequest }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsClaim, Error, { id: string; data: ReopenRightsClaimRequest }>({
    mutationFn: ({ id, data }) => reopenRightsClaim(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useApplyClaimBlock = (
  options?: UseMutationOptions<
    RightsClaimAccessBlock[],
    Error,
    { id: string; data: ApplyClaimBlockRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsClaimAccessBlock[], Error, { id: string; data: ApplyClaimBlockRequest }>(
    {
      mutationFn: ({ id, data }) => applyClaimBlock(id, data),
      ...options,
      onSuccess: (data, variables, context) => {
        invalidateClaimState(queryClient);
        (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
          data,
          variables,
          context
        );
      },
    }
  );
};

export const useLiftClaimBlock = (
  options?: UseMutationOptions<
    RightsClaimAccessBlock,
    Error,
    { id: string; blockId: string; data: LiftClaimBlockRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsClaimAccessBlock,
    Error,
    { id: string; blockId: string; data: LiftClaimBlockRequest }
  >({
    mutationFn: ({ id, blockId, data }) => liftClaimBlock(id, blockId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useLinkClaimComponent = (
  options?: UseMutationOptions<
    RightsClaimComponentRef,
    Error,
    { id: string; data: LinkClaimComponentRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsClaimComponentRef,
    Error,
    { id: string; data: LinkClaimComponentRequest }
  >({
    mutationFn: ({ id, data }) => linkClaimComponent(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useUnlinkClaimComponent = (
  options?: UseMutationOptions<
    { success: boolean },
    Error,
    { id: string; claimComponentId: string }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { id: string; claimComponentId: string }>({
    mutationFn: ({ id, claimComponentId }) => unlinkClaimComponent(id, claimComponentId),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useAddClaimAttachment = (
  options?: UseMutationOptions<
    RightsClaimAttachment,
    Error,
    { id: string; data: CreateClaimAttachmentRequest }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    RightsClaimAttachment,
    Error,
    { id: string; data: CreateClaimAttachmentRequest }
  >({
    mutationFn: ({ id, data }) => addClaimAttachment(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const useRemoveClaimAttachment = (
  options?: UseMutationOptions<{ success: boolean }, Error, { id: string; attachmentId: string }>
) => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { id: string; attachmentId: string }>({
    mutationFn: ({ id, attachmentId }) => removeClaimAttachment(id, attachmentId),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateClaimState(queryClient);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};
