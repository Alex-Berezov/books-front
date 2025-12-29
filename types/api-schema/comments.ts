import type { UUID, ISODate, PaginationMeta } from './common';

export type CommentStatus = 'visible' | 'hidden';

export interface Comment {
  id: UUID;
  content: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  bookTitle: string;
  bookId: UUID;
  createdAt: ISODate;
  status: CommentStatus;
  repliesCount: number;
}

export interface GetCommentsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CommentStatus | 'all';
  bookId?: UUID;
}

export interface CommentsResponse {
  data: Comment[];
  meta: PaginationMeta;
}

export interface UpdateCommentStatusRequest {
  status: CommentStatus;
}

export interface ReplyToCommentRequest {
  content: string;
}
