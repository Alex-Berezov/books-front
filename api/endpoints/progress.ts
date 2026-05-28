/**
 * Progress Endpoints
 *
 * API endpoints for saving and updating user reading/listening progress.
 */

import { httpPutAuth, httpGetAuth } from '@/lib/http-client';
import type { UpdateProgressRequest, ReadingProgress } from '@/types/api-schema';

/**
 * Get user reading/listening progress for a specific book version
 *
 * @param versionId - Book version ID
 * @returns Progress data
 */
export const getProgress = async (versionId: string): Promise<ReadingProgress> => {
  const endpoint = `/me/progress/${versionId}`;
  return httpGetAuth<ReadingProgress>(endpoint);
};

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
