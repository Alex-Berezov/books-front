/**
 * Progress Endpoints
 *
 * API endpoints for saving and updating user reading/listening progress.
 */

import { httpPutAuth } from '@/lib/http-client';
import type { UpdateProgressRequest } from '@/types/api-schema';

/**
 * Update user reading progress for a specific book version
 *
 * @param versionId - Book version ID
 * @param data - Progress updates (chapterId, position, percentage)
 */
export const updateTextProgress = async (
  versionId: string,
  data: UpdateProgressRequest
): Promise<void> => {
  const endpoint = `/me/progress/${versionId}`;
  return httpPutAuth<void>(endpoint, data);
};
