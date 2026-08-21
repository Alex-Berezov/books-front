/**
 * React Query hooks for working with book versions
 *
 * Book version is a specific language version of a book.
 * Contains content, chapters, categories and tags.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  checkVersionRightsContentHash,
  checkGeoBlockAccess,
  createBookVersion,
  generateGeoBlockRules,
  getBookVersion,
  getGeoBlockRules,
  getVersionRightsContentHash,
  publishVersion,
  unpublishVersion,
  updateBookVersion,
  upsertVersionSeo,
  getPublicationGate,
  updateVersionRightsGeoBlock,
  getVersionRightsDashboard,
  verifyGeoBlockRules,
} from '@/api/endpoints/admin/bookVersions';
import type { ApiError } from '@/types/api';
import type {
  BookVersionDetail,
  CreateBookVersionRequest,
  UpdateBookVersionRequest,
} from '@/types/api-schema';
import type { BookRightsDashboard } from '@/types/api-schema/book-rights';
import type {
  CheckGeoBlockAccessRequest,
  GeoAccessCheckResult,
  GeoBlockRulesResponse,
  VerifyGeoBlockRulesRequest,
} from '@/types/api-schema/geo-block';
import type { SeoData, SeoInput } from '@/types/api-schema/pages';
import type {
  PublicationGateResult,
  RightsContentHashCheck,
  UpdateRightsGeoBlockRequest,
} from '@/types/api-schema/rights-intake';
import { bookKeys } from './useBooks';

/**
 * Query keys for book versions
 */
export const versionKeys = {
  /** All version queries */
  all: ['versions'] as const,
  /** Version details */
  details: () => [...versionKeys.all, 'detail'] as const,
  /** Version details by ID */
  detail: (id: string) => [...versionKeys.details(), id] as const,
  /** Version rights dashboard */
  rightsDashboard: (id: string) => [...versionKeys.detail(id), 'rights-dashboard'] as const,
  /** Generated runtime geo-block rules */
  geoBlockRules: (id: string) => [...versionKeys.detail(id), 'geo-block-rules'] as const,
  /**
   * Ответ гейта публикации. Ключ собирался строкой в четырёх местах: разойдись они хоть в одном,
   * инвалидация промахнётся молча — редактор будет видеть устаревший запрет на публикацию.
   */
  publicationGate: (id: string | undefined) =>
    [...versionKeys.all, 'publication-gate', id] as const,
};

/**
 * Hook for getting book version details
 *
 * @param versionId - Book version ID
 * @param options - React Query options
 * @returns React Query result with version details
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useBookVersion('version-uuid');
 * ```
 */
export const useBookVersion = (
  versionId: string,
  options?: Omit<UseQueryOptions<BookVersionDetail>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: versionKeys.detail(versionId),
    queryFn: () => getBookVersion(versionId),
    staleTime: 30 * 1000, // 30 seconds (reduced for better cache invalidation)
    ...options,
  });
};

/**
 * Hook for creating a new book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for creating version
 *
 * @example
 * ```tsx
 * const createMutation = useCreateBookVersion({
 *   onSuccess: (data) => {
 *     console.log('Version created:', data.id);
 *   }
 * });
 *
 * createMutation.mutate({
 *   bookId: 'book-uuid',
 *   data: {
 *     language: 'en',
 *     title: 'Harry Potter',
 *     author: 'J.K. Rowling',
 *     type: 'text',
 *     isFree: true
 *   }
 * });
 * ```
 */
export const useCreateBookVersion = (
  options?: UseMutationOptions<
    BookVersionDetail,
    Error,
    { bookId: string; data: CreateBookVersionRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, data }) => createBookVersion(bookId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate books list for update
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
      // Invalidate version details (will be fetched on redirect)
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(data.id) });
      // Invalidate book container details to update version list in switcher
      queryClient.invalidateQueries({ queryKey: bookKeys.detail(variables.bookId) });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for updating existing book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for updating version
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateBookVersion({
 *   onSuccess: () => {
 *     toast.success('Version updated');
 *   }
 * });
 *
 * updateMutation.mutate({
 *   versionId: 'version-uuid',
 *   data: {
 *     title: 'Updated Title'
 *   }
 * });
 * ```
 */
export const useUpdateBookVersion = (
  options?: UseMutationOptions<
    BookVersionDetail,
    Error,
    { versionId: string; data: UpdateBookVersionRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => updateBookVersion(versionId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate version details to refetch with latest data
      // (SEO might be updated separately, so we need fresh data)
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
      // Ответ гейта публикации зависит от описания и обложки: без сброса редактор дописывает
      // описание, жмёт Publish и до минуты видит блокер «Версия не наполнена» на заполненной
      // версии — запрос при этом даже не уходит.
      queryClient.invalidateQueries({
        queryKey: versionKeys.publicationGate(variables.versionId),
      });
      // Invalidate books list
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for publishing book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for publishing
 *
 * @example
 * ```tsx
 * const publishMutation = usePublishVersion({
 *   onSuccess: () => {
 *     toast.success('Version published');
 *   }
 * });
 *
 * publishMutation.mutate('version-uuid');
 * ```
 */
export const usePublishVersion = (
  options?: UseMutationOptions<BookVersionDetail, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => publishVersion(versionId),
    ...options,
    onSuccess: (data, versionId, context) => {
      // Invalidate version details to refetch with updated status
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(versionId) });
      // Смена статуса меняет и ответ гейта: без сброса панель публикации до минуты показывает
      // вердикт, снятый в прежнем статусе.
      queryClient.invalidateQueries({ queryKey: versionKeys.publicationGate(versionId) });
      // Invalidate books list
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        versionId,
        context
      );
    },
  });
};

/**
 * Hook for unpublishing book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for unpublishing
 *
 * @example
 * ```tsx
 * const unpublishMutation = useUnpublishVersion({
 *   onSuccess: () => {
 *     toast.info('Version unpublished');
 *   }
 * });
 *
 * unpublishMutation.mutate('version-uuid');
 * ```
 */
export const useUnpublishVersion = (
  options?: UseMutationOptions<BookVersionDetail, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => unpublishVersion(versionId),
    ...options,
    onSuccess: (data, versionId, context) => {
      // Invalidate version details to refetch with updated status
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(versionId) });
      // Смена статуса меняет и ответ гейта: без сброса панель публикации до минуты показывает
      // вердикт, снятый в прежнем статусе.
      queryClient.invalidateQueries({ queryKey: versionKeys.publicationGate(versionId) });
      // Invalidate books list
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        versionId,
        context
      );
    },
  });
};

/**
 * Hook for upserting SEO metadata for book version
 *
 * Creates or updates SEO data using PUT endpoint.
 * Use this to save SEO fields separately from version data.
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for upserting SEO
 *
 * @example
 * ```tsx
 * const seoMutation = useUpsertVersionSeo({
 *   onSuccess: () => {
 *     toast.success('SEO updated');
 *   }
 * });
 *
 * seoMutation.mutate({
 *   versionId: 'version-uuid',
 *   data: {
 *     metaTitle: 'Harry Potter SEO',
 *     metaDescription: 'Best book',
 *     ogTitle: 'Harry Potter'
 *   }
 * });
 * ```
 */
export const useUpsertVersionSeo = (
  options?: UseMutationOptions<SeoData, ApiError, { versionId: string; data: SeoInput }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => upsertVersionSeo(versionId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate version details to refetch with updated SEO
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

export const usePublicationGate = (
  versionId: string | undefined,
  options?: Omit<UseQueryOptions<PublicationGateResult>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: versionKeys.publicationGate(versionId),
    queryFn: () => getPublicationGate(versionId!),
    enabled: Boolean(versionId),
    retry: false,
    ...options,
  });
};

export const useUpdateVersionRightsGeoBlock = (
  options?: UseMutationOptions<
    BookVersionDetail,
    Error,
    { versionId: string; data: UpdateRightsGeoBlockRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => updateVersionRightsGeoBlock(versionId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
      // Отметка «geo-block настроен» — вход одного из блокеров гейта: без сброса панель
      // публикации до минуты продолжает показывать `GEO_BLOCK_NOT_CONFIGURED`.
      queryClient.invalidateQueries({
        queryKey: versionKeys.publicationGate(variables.versionId),
      });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

// Phase 8: Content Hash
export const useVersionRightsContentHash = (
  versionId: string | undefined,
  options?: Omit<UseQueryOptions<RightsContentHashCheck>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: [...versionKeys.all, 'content-hash', versionId],
    queryFn: () => getVersionRightsContentHash(versionId!),
    enabled: Boolean(versionId),
    retry: false,
    ...options,
  });
};

export const useCheckVersionRightsContentHash = (
  options?: UseMutationOptions<RightsContentHashCheck, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => checkVersionRightsContentHash(versionId),
    ...options,
    onSuccess: (_data, versionId, context) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(versionId) });
      queryClient.invalidateQueries({ queryKey: versionKeys.rightsDashboard(versionId) });
      queryClient.invalidateQueries({
        queryKey: versionKeys.publicationGate(versionId),
      });
      queryClient.invalidateQueries({ queryKey: [...versionKeys.all, 'content-hash', versionId] });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        _data,
        versionId,
        context
      );
    },
  });
};

export const useVersionRightsDashboard = (
  versionId: string | undefined,
  options?: Omit<UseQueryOptions<BookRightsDashboard, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: versionKeys.rightsDashboard(versionId || ''),
    queryFn: () => getVersionRightsDashboard(versionId!),
    enabled: Boolean(versionId),
    ...options,
  });
};

const invalidateGeoBlockState = (
  queryClient: ReturnType<typeof useQueryClient>,
  versionId: string
) => {
  queryClient.invalidateQueries({ queryKey: versionKeys.detail(versionId) });
  queryClient.invalidateQueries({ queryKey: versionKeys.geoBlockRules(versionId) });
  queryClient.invalidateQueries({ queryKey: versionKeys.rightsDashboard(versionId) });
  queryClient.invalidateQueries({ queryKey: versionKeys.publicationGate(versionId) });
};

export const useGeoBlockRules = (
  versionId: string | undefined,
  options?: Omit<UseQueryOptions<GeoBlockRulesResponse, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: versionKeys.geoBlockRules(versionId || ''),
    queryFn: () => getGeoBlockRules(versionId!),
    enabled: Boolean(versionId),
    ...options,
  });
};

export const useGenerateGeoBlockRules = (
  options?: UseMutationOptions<GeoBlockRulesResponse, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => generateGeoBlockRules(versionId),
    ...options,
    onSuccess: (data, versionId, context) => {
      invalidateGeoBlockState(queryClient, versionId);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        versionId,
        context
      );
    },
  });
};

export const useCheckGeoBlockAccess = (
  options?: UseMutationOptions<
    GeoAccessCheckResult,
    Error,
    { versionId: string; data: CheckGeoBlockAccessRequest }
  >
) => {
  return useMutation({
    mutationFn: ({ versionId, data }) => checkGeoBlockAccess(versionId, data),
    ...options,
  });
};

export const useVerifyGeoBlockRules = (
  options?: UseMutationOptions<
    GeoBlockRulesResponse,
    Error,
    { versionId: string; data: VerifyGeoBlockRulesRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => verifyGeoBlockRules(versionId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateGeoBlockState(queryClient, variables.versionId);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};
