/**
 * Chapters Endpoints
 *
 * API endpoints for working with book chapters.
 * Chapter is a structural element of a book version with content,
 * order index and access settings.
 */

import { fromRolloutEnvelope } from '@/lib/api/paginated-envelope';
import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  ChapterDetail,
  CreateChapterRequest,
  PaginatedResult,
  UpdateChapterRequest,
} from '@/types/api-schema';

/**
 * Get list of chapters for book version
 *
 * Uses `/admin/versions/:versionId/chapters` so the list works for drafts too:
 * the public route answers only for published versions and returns
 * `404 Book version not found` for a draft, which is the normal state of a
 * version being prepared.
 *
 * @param versionId - Book version ID
 * @returns All chapters of the version as one page
 *
 * @example
 * ```ts
 * const { items } = await getChapters('version-uuid');
 * ```
 */
export const getChapters = async (versionId: string): Promise<PaginatedResult<ChapterDetail>> => {
  const endpoint = `/admin/versions/${versionId}/chapters`;
  // ⚠️ Переходник окна выката `W9` (`LEGACY-379`): до тега бэкенд отвечает массивом.
  return fromRolloutEnvelope<ChapterDetail>(
    await httpGetAuth<ChapterDetail[] | PaginatedResult<ChapterDetail>>(endpoint)
  );
};

/**
 * Create a new chapter
 *
 * @param versionId - Book version ID
 * @param data - New chapter data
 * @returns Created chapter
 *
 * @example
 * ```ts
 * const chapter = await createChapter('version-uuid', {
 *   orderIndex: 1,
 *   title: 'Introduction',
 *   content: '# Chapter 1\n\nContent...',
 *   isFree: true
 * });
 * ```
 */
export const createChapter = async (
  versionId: string,
  data: CreateChapterRequest
): Promise<ChapterDetail> => {
  const endpoint = `/versions/${versionId}/chapters`;
  return httpPostAuth<ChapterDetail>(endpoint, data);
};

/**
 * Update chapter
 *
 * @param chapterId - Chapter ID
 * @param data - New chapter data
 * @returns Updated chapter
 *
 * @example
 * ```ts
 * const chapter = await updateChapter('chapter-uuid', {
 *   title: 'Updated Title',
 *   content: 'New content...'
 * });
 * ```
 */
export const updateChapter = async (
  chapterId: string,
  data: UpdateChapterRequest
): Promise<ChapterDetail> => {
  const endpoint = `/chapters/${chapterId}`;
  return httpPatchAuth<ChapterDetail>(endpoint, data);
};

/**
 * Delete chapter
 *
 * @param chapterId - Chapter ID
 *
 * @example
 * ```ts
 * await deleteChapter('chapter-uuid');
 * ```
 */
export const deleteChapter = async (chapterId: string): Promise<void> => {
  const endpoint = `/chapters/${chapterId}`;
  return httpDeleteAuth<void>(endpoint);
};
