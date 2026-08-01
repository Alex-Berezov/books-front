import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  getRightsFileLimits,
  supersedeRightsEvidence,
  uploadRightsEvidenceArchiveCopy,
  uploadRightsReportPdf,
  uploadRightsSourceFile,
} from '@/api/endpoints/admin/rights-files';
import { versionKeys } from '@/api/hooks/useBookVersions';
import { rightsIntakeKeys } from '@/api/hooks/useRightsIntakes';
import type {
  RightsFileDescriptor,
  RightsFileLimits,
  SupersedeRightsEvidenceResponse,
} from '@/types/api-schema/rights-intake';

export const rightsFileKeys = {
  all: ['rights-files'] as const,
  limits: () => [...rightsFileKeys.all, 'limits'] as const,
};

/** Server-side upload limits and allowed MIME types. Cached: they change with a deploy, not a user. */
export const useRightsFileLimits = (
  options?: Omit<UseQueryOptions<RightsFileLimits, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RightsFileLimits, Error>({
    queryKey: rightsFileKeys.limits(),
    queryFn: getRightsFileLimits,
    staleTime: Infinity,
    ...options,
  });

/**
 * WP-9.2: upload of the report PDF.
 *
 * The descriptor lives on the review import, so the intake tree is invalidated — the panel
 * re-reads `hasReportPdf` from the import detail.
 */
export const useUploadRightsReportPdf = (
  options?: UseMutationOptions<RightsFileDescriptor, Error, { importId: string; file: File }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsFileDescriptor, Error, { importId: string; file: File }>({
    mutationFn: ({ importId, file }) => uploadRightsReportPdf(importId, file),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

/**
 * WP-8.3: upload of the source edition file.
 *
 * The checksum of this file is part of the clearance content hash, so the upload marks every
 * version built on the profile as needing a re-check — `versionKeys` are invalidated alongside
 * the intake tree, exactly like closing a rights action (WP-5.2).
 */
export const useUploadRightsSourceFile = (
  options?: UseMutationOptions<RightsFileDescriptor, Error, { profileId: string; file: File }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsFileDescriptor, Error, { profileId: string; file: File }>({
    mutationFn: ({ profileId, file }) => uploadRightsSourceFile(profileId, file),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
      queryClient.invalidateQueries({ queryKey: versionKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

/** WP-9.3: upload of the archived copy of an evidence document. */
export const useUploadRightsEvidenceArchiveCopy = (
  options?: UseMutationOptions<RightsFileDescriptor, Error, { evidenceId: string; file: File }>
) => {
  const queryClient = useQueryClient();
  return useMutation<RightsFileDescriptor, Error, { evidenceId: string; file: File }>({
    mutationFn: ({ evidenceId, file }) => uploadRightsEvidenceArchiveCopy(evidenceId, file),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

/**
 * WP-9.3: marks an evidence as superseded by another one.
 *
 * Evidence is never deleted (ADR-009), so "it no longer holds" is expressed by a pointer to the
 * successor. Country verdicts quote evidence, hence versions are invalidated too.
 */
export const useSupersedeRightsEvidence = (
  options?: UseMutationOptions<
    SupersedeRightsEvidenceResponse,
    Error,
    { evidenceId: string; supersededById: string }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation<
    SupersedeRightsEvidenceResponse,
    Error,
    { evidenceId: string; supersededById: string }
  >({
    mutationFn: ({ evidenceId, supersededById }) =>
      supersedeRightsEvidence(evidenceId, supersededById),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
      queryClient.invalidateQueries({ queryKey: versionKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};
