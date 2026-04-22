/**
 * React Query hook for `GET /uploads/limits`.
 *
 * The limits rarely change, so we cache them for the whole session.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getUploadsLimits } from '@/api/endpoints/admin/uploads';
import type { UploadLimits } from '@/types/api-schema';

export const uploadsKeys = {
  all: ['uploads'] as const,
  limits: () => [...uploadsKeys.all, 'limits'] as const,
};

export const useUploadsLimits = (
  options?: Omit<UseQueryOptions<UploadLimits>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: uploadsKeys.limits(),
    queryFn: getUploadsLimits,
    // Limits are essentially static — cache for the whole session.
    staleTime: Infinity,
    gcTime: Infinity,
    ...options,
  });
};
