import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { deleteMedia, getMediaFiles, uploadMedia } from '@/api/endpoints/admin/media';
import type { GetMediaParams, MediaResponse, UploadMediaResponse, UUID } from '@/types/api-schema';

export const mediaKeys = {
  all: ['media'] as const,
  lists: () => [...mediaKeys.all, 'list'] as const,
  list: (params: GetMediaParams) => [...mediaKeys.lists(), params] as const,
};

export const useMediaFiles = (
  params: GetMediaParams = {},
  options?: Omit<UseQueryOptions<MediaResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: mediaKeys.list(params),
    queryFn: () => getMediaFiles(params),
    ...options,
  });
};

export const useUploadMedia = (
  options?: UseMutationOptions<UploadMediaResponse, Error, FormData>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadMedia,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      // @ts-expect-error - TanStack Query types mismatch workaround
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useDeleteMedia = (options?: UseMutationOptions<void, Error, UUID>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMedia,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      // @ts-expect-error - TanStack Query types mismatch workaround
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
