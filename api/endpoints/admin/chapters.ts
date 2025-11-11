/**
 * Chapters Endpoints
 *
 * API endpoints for working with book chapters.
 * Chapter is a structural element of a book version with content,
 * order index and access settings.
 */

import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  ChapterDetail,
  CreateChapterRequest,
  ReorderChaptersRequest,
  UpdateChapterRequest,
} from '@/types/api-schema';

/**
 * Get list of chapters for book version
 *
 * @param versionId - Book version ID
 * @returns Array of chapters
 *
 * @example
 * ```ts
 * const chapters = await getChapters('version-uuid');
 * ```
 */
export const getChapters = async (versionId: string): Promise<ChapterDetail[]> => {
  const endpoint = `/versions/${versionId}/chapters`;
  return httpGetAuth<ChapterDetail[]>(endpoint);
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

/**
 * Reorder chapters
 *
 * @param versionId - Book version ID
 * @param data - New chapters order
 * @returns Array of chapters in new order
 *
 * @example
 * ```ts
 * const chapters = await reorderChapters('version-uuid', {
 *   chapterIds: ['chapter-3', 'chapter-1', 'chapter-2']
 * });
 * ```
 */
export const reorderChapters = async (
  versionId: string,
  data: ReorderChaptersRequest
): Promise<ChapterDetail[]> => {
  const endpoint = `/versions/${versionId}/chapters/reorder`;
  return httpPostAuth<ChapterDetail[]>(endpoint, data);
};
