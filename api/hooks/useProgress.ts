/**
 * React Query hooks for reading progress
 */

import { useMutation } from '@tanstack/react-query';
import { updateTextProgress } from '@/api/endpoints/progress';
import type { UpdateProgressRequest } from '@/types/api-schema';

/**
 * Hook to update text reading progress
 *
 * @param versionId - Book version ID
 */
export const useUpdateTextProgress = (versionId: string) => {
  return useMutation({
    mutationFn: (data: UpdateProgressRequest) => updateTextProgress(versionId, data),
    onError: (err) => {
      console.warn('Failed to update text progress:', err);
    },
  });
};
