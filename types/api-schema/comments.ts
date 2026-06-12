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

// --- Client comments & reviews types ---

export interface CommentUser {
  id: UUID;
  email: string;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface ClientComment {
  id: UUID;
  parentId?: UUID | null;
  bookVersionId?: UUID | null;
  chapterId?: UUID | null;
  audioChapterId?: UUID | null;
  ratingId?: UUID | null;
  ratingScore?: number | null;
  text: string;
  isHidden: boolean;
  isDeleted: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  user: CommentUser;
  children: ClientComment[];
}

export interface CreateCommentRequest {
  parentId?: UUID | null;
  bookVersionId?: UUID | null;
  chapterId?: UUID | null;
  audioChapterId?: UUID | null;
  text: string;
  rating?: number | null; // Rating score (1-5)
}

export interface GetBookCommentsParams {
  target: 'version' | 'chapter' | 'audio';
  targetId: UUID;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'popularity';
}

export interface BookCommentsResponse {
  items: ClientComment[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

// --- Reaction / Likes types ---

export interface ToggleLikeRequest {
  commentId?: UUID;
  bookVersionId?: UUID;
  isLike?: boolean; // Default true (like)
}

export interface ToggleLikeResponse {
  liked: boolean;
  isLike: boolean;
  likes: number;
  dislikes: number;
}

export interface LikeCountResponse {
  likes: number;
  dislikes: number;
}
