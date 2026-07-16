/**
 * Types for Books endpoints
 *
 * Books, versions, book containers
 */

import type { Category } from './categories';
import type { Chapter } from './chapters';
import type { ISODate, PublicationStatus, SupportedLang, UUID, VersionType } from './common';
import type { SeoData } from './pages';
import type { Tag } from './tags';

/**
 * Book version preview
 */
export interface VersionPreview {
  id: UUID;
  type: VersionType;
  slug?: string;
  title?: string;
  author?: string;
  language?: SupportedLang;
  coverImageUrl?: string;
  coverUrl?: string; // Alias for backward compatibility
  isFree: boolean;
  status?: PublicationStatus;
  chaptersCount: number;
  duration?: number; // In seconds for audio
  originalLanguage?: string | null;
  copyrightStatus?: string | null;
  authorPageUrl?: string | null;
  characters?: { name: string; description: string }[] | null;
  quotes?: { text: string; author?: string }[] | null;
  faq?: { question: string; answer: string }[] | null;
  themes?: string[] | null;
  alternativeTitles?: string[] | null;
  shortDescription?: string | null;
  summaryShort?: string | null;
  symbols?: { title: string; description: string }[] | null;
  coverAlt?: string | null;
  originalTitle?: string | null;
}

/**
 * Compact book card model for lists/recommendations.
 *
 * Contains only the fields required by the BookCard component.
 * Intentionally does NOT include versions[], _count, tags, categories,
 * translations, description, JSON content fields, SEO, etc.
 *
 * `id` is the canonical Book.id (bookId), used for deduplication, ratings and relations.
 * `slug` is the BookVersion.slug for the requested :lang.
 * `authorSlug` is null when authorId is null (legacy data) — do NOT generate from display name.
 */
export interface BookCardModel {
  id: UUID;
  slug: string;
  title: string;
  author: string;
  authorSlug: string | null;
  coverImageUrl: string | null;
  rating: number | null;
  ratingsCount: number;
  hasText: boolean;
  hasAudio: boolean;
  publishedAt: ISODate | null;
}

/**
 * Related books response: same-author cards + similar-by-category cards.
 */
export interface RelatedBooksResponse {
  sameAuthor: BookCardModel[];
  similar: BookCardModel[];
}

/**
 * Book overview information
 */
export interface BookOverview {
  id: UUID;
  slug: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  coverImageUrl?: string;
  rating?: number;
  publicationYear?: number;
  firstPublishedYear?: number;
  editionPublishedYear?: number;
  language: SupportedLang;
  categories: Category[];
  tags: Tag[];
  primaryCategoryId?: string | null;
  primaryCategory?: Category | null;
  versions: VersionPreview[];
  createdAt: ISODate;
  updatedAt: ISODate;
  versionIds?: {
    text: string | null;
    audio: string | null;
  };
  hasText?: boolean;
  hasAudio?: boolean;
  hasSummary?: boolean;
  seo?: {
    main?: SeoData | null;
    read?: SeoData | null;
    listen?: SeoData | null;
    summary?: SeoData | null;
  } | null;
}

/**
 * Request to create a new book (container)
 */
export interface CreateBookRequest {
  slug: string;
}

/**
 * Response on book creation
 */
export interface CreateBookResponse {
  id: UUID;
  slug: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Book version
 */
export interface BookVersion {
  id: UUID;
  bookId: UUID;
  type: VersionType;
  title?: string;
  description?: string;
  isFree: boolean;
  status: PublicationStatus;
  /** Optional preview audio MediaAsset id (audio versions). See contract §5. */
  previewMediaId?: UUID | null;
  chapters: Chapter[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Detailed book version information (for admin panel)
 */
export interface BookVersionDetail {
  id: UUID;
  bookId: UUID;
  bookSlug: string;
  language: SupportedLang;
  title: string;
  author: string;
  description?: string;
  coverImageUrl?: string;
  type: VersionType;
  isFree: boolean;
  status: PublicationStatus;
  publishedAt?: ISODate;
  referralUrl?: string;
  /** Optional preview audio MediaAsset id (audio versions). See contract §5. */
  previewMediaId?: UUID | null;
  /** ID основной категории книги для хлебных крошек */
  primaryCategoryId?: UUID | null;
  firstPublishedYear?: number | null;
  editionPublishedYear?: number | null;
  originalLanguage?: string | null;
  copyrightStatus?: string | null;
  authorPageUrl?: string | null;
  authorId?: UUID | null;
  characters?: { name: string; description: string }[] | null;
  quotes?: { text: string; author?: string }[] | null;
  faq?: { question: string; answer: string }[] | null;
  themes?: string[] | null;
  originalTitle?: string | null;
  alternativeTitles?: string[] | null;
  shortDescription?: string | null;
  summaryShort?: string | null;
  symbols?: { title: string; description: string }[] | null;
  coverAlt?: string | null;
  /** SEO metadata (full SEO entity) */
  seo?: SeoData;
  /** Attached categories */
  categories?: Category[];
  /** Attached tags */
  tags?: Tag[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Request to create a new book version
 */
export interface CreateBookVersionRequest {
  /** Book version language */
  language: SupportedLang;
  /** Book title */
  title: string;
  /** Book author */
  author: string;
  /** Book description (required) */
  description: string;
  /** Book cover URL (required) */
  coverImageUrl: string;
  /** Version type (text, audio, or referral) */
  type: VersionType;
  /** Whether version is free */
  isFree: boolean;
  /** URL for referral links (optional) */
  referralUrl?: string;
  /** ID основной категории книги для хлебных крошек */
  primaryCategoryId?: UUID | null;
  firstPublishedYear?: number | null;
  editionPublishedYear?: number | null;
  originalLanguage?: string | null;
  copyrightStatus?: string | null;
  authorPageUrl?: string | null;
  characters?: { name: string; description: string }[] | null;
  quotes?: { text: string; author?: string }[] | null;
  faq?: { question: string; answer: string }[] | null;
  themes?: string[] | null;
  originalTitle?: string | null;
  alternativeTitles?: string[] | null;
  shortDescription?: string | null;
  summaryShort?: string | null;
  symbols?: { title: string; description: string }[] | null;
  coverAlt?: string | null;
}

/**
 * Request to update book version
 */
export interface UpdateBookVersionRequest {
  /** Localized slug for the book version */
  slug?: string;
  /** Book title */
  title?: string;
  /** Book author */
  author?: string;
  /** Book description */
  description?: string;
  /** Book cover URL */
  coverImageUrl?: string;
  /** Version type (text or audio) */
  type?: VersionType;
  /** Whether version is free */
  isFree?: boolean;
  /** URL for referral links */
  referralUrl?: string;
  /** Preview audio MediaAsset id (nullable to clear). See contract §5. */
  previewMediaId?: UUID | null;
  /** ID основной категории книги для хлебных крошек */
  primaryCategoryId?: UUID | null;
  firstPublishedYear?: number | null;
  editionPublishedYear?: number | null;
  originalLanguage?: string | null;
  copyrightStatus?: string | null;
  authorPageUrl?: string | null;
  characters?: { name: string; description: string }[] | null;
  quotes?: { text: string; author?: string }[] | null;
  faq?: { question: string; answer: string }[] | null;
  themes?: string[] | null;
  originalTitle?: string | null;
  alternativeTitles?: string[] | null;
  shortDescription?: string | null;
  summaryShort?: string | null;
  symbols?: { title: string; description: string }[] | null;
  coverAlt?: string | null;
}

/**
 * Book summary (пересказ/выжимка) for a specific book version
 */
export interface BookSummaryDetail {
  id: UUID;
  /** Brief overview / summary text */
  summary: string;
  /** Analysis / key takeaways */
  analysis?: string;
  /** Major themes */
  themes?: string;
}

/**
 * Request to upsert book summary for a version
 */
export interface UpsertBookSummaryRequest {
  /** Brief overview / summary text */
  summary: string;
  /** Analysis / key takeaways */
  analysis?: string;
  /** Major themes */
  themes?: string;
}
