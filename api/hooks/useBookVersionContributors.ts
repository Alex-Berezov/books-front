import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookVersionContributorsApi } from '@/api/endpoints/admin/bookVersionContributors';
import type {
  CreateBookVersionContributorDto,
  UpdateBookVersionContributorDto,
} from '@/api/endpoints/admin/bookVersionContributors';

export function useBookVersionContributors(versionId: string) {
  return useQuery({
    queryKey: ['admin', 'book-versions', versionId, 'contributors'],
    queryFn: () => bookVersionContributorsApi.list(versionId),
    enabled: Boolean(versionId),
  });
}

export function useAddBookVersionContributor(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBookVersionContributorDto) =>
      bookVersionContributorsApi.add(versionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'book-versions', versionId, 'contributors'],
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
    },
  });
}

export function useUpdateBookVersionContributor(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contributorId,
      payload,
    }: {
      contributorId: string;
      payload: UpdateBookVersionContributorDto;
    }) => bookVersionContributorsApi.update(versionId, contributorId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'book-versions', versionId, 'contributors'],
      });
    },
  });
}

export function useRemoveBookVersionContributor(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contributorId: string) =>
      bookVersionContributorsApi.remove(versionId, contributorId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'book-versions', versionId, 'contributors'],
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
    },
  });
}

export function useReorderBookVersionContributors(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contributorIds: string[]) =>
      bookVersionContributorsApi.reorder(versionId, contributorIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'book-versions', versionId, 'contributors'],
      });
    },
  });
}
