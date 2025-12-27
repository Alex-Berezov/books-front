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
  BookVersion,
  BookVersionDetail,
  CreateBookRequest,
  CreateBookResponse,
  CreateBookVersionRequest,
  UpdateBookVersionRequest,
  VersionPreview,
} from './books';

// Chapters
export type {
  Chapter,
  ChapterDetail,
  CreateChapterRequest,
  ReorderChaptersRequest,
  UpdateChapterRequest,
} from './chapters';

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
  DetachTagRequest,
  Tag,
  TagBooksResponse,
  TagTranslation,
  UpdateTagRequest,
} from './tags';

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
