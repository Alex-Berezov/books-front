import { httpGetAuth, httpPatchAuth, httpDeleteAuth, httpPostAuth } from '@/lib/http-client';
import type {
  CommentsResponse,
  GetCommentsParams,
  UpdateCommentStatusRequest,
  ReplyToCommentRequest,
  Comment,
} from '@/types/api-schema/comments';
import type { UUID } from '@/types/api-schema/common';

export const commentsApi = {
  getComments: (params: GetCommentsParams) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    if (params.search) queryParams.append('search', params.search);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.bookId) queryParams.append('bookId', params.bookId);

    const endpoint = `/comments?${queryParams.toString()}`;
    return httpGetAuth<CommentsResponse>(endpoint);
  },

  getComment: (id: UUID) => {
    return httpGetAuth<Comment>(`/comments/${id}`);
  },

  updateCommentStatus: (id: UUID, data: UpdateCommentStatusRequest) => {
    return httpPatchAuth<Comment>(`/comments/${id}/status`, data);
  },

  deleteComment: (id: UUID) => {
    return httpDeleteAuth(`/comments/${id}`);
  },

  replyToComment: (id: UUID, data: ReplyToCommentRequest) => {
    return httpPostAuth<Comment>(`/comments/${id}/reply`, data);
  },
};
