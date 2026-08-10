import type { UUID, ISODate, PaginationMeta } from './common';

export type CommentStatus = 'visible' | 'hidden';

export interface CommentAuthor {
  id: UUID;
  name: string | null;
  nickname: string | null;
  /** Почта под гвардом: модератору нужно отличать однофамильцев (LEGACY-089). */
  email: string;
  avatarUrl: string | null;
}

/**
 * Comment as the moderation screen sees it — the shape of `GET /admin/comments`.
 *
 * 🔴 Until 10.08.2026 this interface described a contract that did not exist
 * anywhere: `authorName`, `bookTitle` and a `status` field the schema never had
 * (LEGACY-092). The real comment carries `isHidden`, a nested `author` and an
 * optional book — an entity is either hidden or not, there is no third state.
 */
export interface Comment {
  id: UUID;
  text: string;
  isHidden: boolean;
  createdAt: ISODate;
  author: CommentAuthor;
  bookTitle: string | null;
  bookId: UUID | null;
  /** Нужен, чтобы ответить: создание комментария требует цель, а не только parentId. */
  bookVersionId: UUID | null;
  parentId: UUID | null;
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

export interface ModerateCommentRequest {
  isHidden: boolean;
}

export interface CreateReplyRequest {
  parentId: UUID;
  bookVersionId: UUID;
  text: string;
}

// --- Client comments & reviews types ---

/**
 * ⚠️ `email` is deliberately absent: reviews are visible to anonymous callers,
 * and until 10.08.2026 every commenter's address travelled along with them
 * (`LEGACY-089`). No component ever read the field — it just went over the wire.
 */
export interface CommentUser {
  id: UUID;
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
