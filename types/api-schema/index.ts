/**
 * API Schema Types
 *
 * Temporary types for working with API until generation from OpenAPI.
 * TODO (M2): Replace with auto-generated types from production API
 *
 * @see https://api.bibliaris.com/api/docs-json (when available)
 */

// Common types
export type {
  ISODate,
  PageType,
  PaginatedResponse,
  PaginationMeta,
  PublicationStatus,
  RoleName,
  SupportedLang,
  UUID,
  VersionType,
} from './common';

// Auth
export type {
  AuthResponse,
  LoginRequest,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
} from './auth';

// User
export type { UserMeResponse } from './user';

// Books
export type {
  BookOverview,
  BookSummaryDetail,
  BookVersion,
  BookVersionDetail,
  CreateBookRequest,
  CreateBookResponse,
  CreateBookVersionRequest,
  UpdateBookVersionRequest,
  UpsertBookSummaryRequest,
  VersionPreview,
} from './books';

// Chapters (text)
export type {
  Chapter,
  ChapterDetail,
  CreateChapterRequest,
  ReorderChaptersRequest,
  UpdateChapterRequest,
} from './chapters';

// Audio Chapters
export type {
  AudioChapter,
  AudioChapterDetail,
  AudioChaptersListResponse,
  CreateAudioChapterRequest,
  GetAudioChaptersParams,
  ReorderAudioChaptersRequest,
  UpdateAudioChapterRequest,
} from './audioChapters';

// Categories
export type {
  AttachCategoryRequest,
  Category,
  CategoryBooksResponse,
  CategoryTranslation,
  CategoryTree,
  CreateCategoryRequest,
  CreateCategoryTranslationRequest,
  DetachCategoryRequest,
  UpdateCategoryRequest,
  UpdateCategoryTranslationRequest,
} from './categories';

// Tags
export type {
  AttachTagRequest,
  CreateTagRequest,
  CreateTagTranslationRequest,
  DetachTagRequest,
  Tag,
  TagBooksResponse,
  TagTranslation,
  UpdateTagRequest,
  UpdateTagTranslationRequest,
} from './tags';

// Media
export type {
  GetMediaParams,
  MediaResponse,
  UploadMediaResponse,
  MediaFile,
  MediaType,
} from './media';

// Pages (CMS)
export type {
  CreatePageRequest,
  PageGroup,
  PageResponse,
  PageTranslation,
  SeoData,
  SeoInput,
  SeoResolveRequest,
  SeoResolveResponse,
  UpdatePageRequest,
} from './pages';

// Bookshelf & Reading Progress
export type {
  AddToBookshelfRequest,
  BookshelfItem,
  ReadingProgress,
  UpdateProgressRequest,
} from './bookshelf';

// Comments
export type {
  Comment,
  CommentStatus,
  GetCommentsParams,
  CommentsResponse,
  UpdateCommentStatusRequest,
  ReplyToCommentRequest,
} from './comments';
