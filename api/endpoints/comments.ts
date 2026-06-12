/**
 * Client API endpoints for comments, reviews, and reactions.
 */

import { httpGet } from '@/lib/http';
import { httpPostAuth, httpPatchAuth, httpDeleteAuth } from '@/lib/http-client';
import type {
  BookCommentsResponse,
  ClientComment,
  CreateCommentRequest,
  GetBookCommentsParams,
  ToggleLikeRequest,
  ToggleLikeResponse,
  LikeCountResponse,
} from '@/types/api-schema';

/**
 * Get comments/reviews list for a specific target (version, chapter, audio)
 *
 * @param params - Search parameters (target, targetId, page, limit, sortBy)
 * @returns Paginated comments list
 */
export const getComments = async (params: GetBookCommentsParams): Promise<BookCommentsResponse> => {
  const query = new URLSearchParams({
    target: params.target,
    targetId: params.targetId,
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
    sortBy: params.sortBy ?? 'date',
  });
  return httpGet<BookCommentsResponse>(`/comments?${query.toString()}`);
};

/**
 * Create a new comment or review
 *
 * @param data - Comment creation request body
 * @returns Created comment data
 */
export const createComment = async (data: CreateCommentRequest): Promise<ClientComment> => {
  return httpPostAuth<ClientComment>('/comments', data, {
    requireAuth: true,
  });
};

/**
 * Update a comment text
 *
 * @param id - Comment UUID
 * @param text - New comment text
 * @returns Updated comment data
 */
export const updateComment = async (id: string, text: string): Promise<ClientComment> => {
  return httpPatchAuth<ClientComment>(
    `/comments/${id}`,
    { text },
    {
      requireAuth: true,
    }
  );
};

/**
 * Delete a comment (soft delete)
 *
 * @param id - Comment UUID
 */
export const deleteComment = async (id: string): Promise<void> => {
  return httpDeleteAuth<void>(`/comments/${id}`, {
    requireAuth: true,
  });
};

/**
 * Toggle like/dislike reaction on a comment or book version
 *
 * @param data - Reaction target and type
 * @returns Reaction state and counts
 */
export const toggleLike = async (data: ToggleLikeRequest): Promise<ToggleLikeResponse> => {
  return httpPatchAuth<ToggleLikeResponse>('/likes/toggle', data, {
    requireAuth: true,
  });
};

/**
 * Get reaction counts for a target
 *
 * @param target - Target type ('comment' | 'bookVersion')
 * @param targetId - Target UUID
 * @returns Likes and dislikes counts
 */
export const getLikeCount = async (
  target: 'comment' | 'bookVersion',
  targetId: string
): Promise<LikeCountResponse> => {
  const query = new URLSearchParams({ target, targetId });
  return httpGet<LikeCountResponse>(`/likes/count?${query.toString()}`);
};
