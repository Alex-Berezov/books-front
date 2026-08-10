/**
 * Book Summaries Endpoints
 *
 * API endpoints for managing per-version book summaries
 * (краткий пересказ / выжимка).
 */

import { httpGetAuth, httpPutAuth } from '@/lib/http-client';
import type { BookSummaryDetail, UpsertBookSummaryRequest } from '@/types/api-schema';

/**
 * Get book summary for a version.
 *
 * Returns `null` if no summary is stored yet.
 *
 * @param versionId - Book version ID
 * @returns Summary data or null
 */
/**
 * ⚠️ `optionalAuth`, а не `requireAuth: false`. Один и тот же адрес обслуживает
 * публичную страницу саммари и админскую вкладку, где редактор пишет текст **до**
 * публикации. С 10.08.2026 черновик отдаётся только по токену (`LEGACY-090`);
 * без него редактор увидел бы 404 на собственной незавершённой работе.
 */
export const getBookSummary = async (versionId: string): Promise<BookSummaryDetail | null> => {
  const endpoint = `/versions/${versionId}/summary`;
  return httpGetAuth<BookSummaryDetail | null>(endpoint, { optionalAuth: true });
};

/**
 * Upsert book summary for a version (create or update).
 *
 * @param versionId - Book version ID
 * @param data - Summary data to store
 * @returns Stored summary
 */
export const upsertBookSummary = async (
  versionId: string,
  data: UpsertBookSummaryRequest
): Promise<BookSummaryDetail> => {
  const endpoint = `/versions/${versionId}/summary`;
  return httpPutAuth<BookSummaryDetail>(endpoint, data);
};
