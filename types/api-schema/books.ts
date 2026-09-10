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
  slug?: string | null;
  title?: string;
  author?: string;
  language?: SupportedLang;
  coverImageUrl?: string;
  coverUrl?: string; // Alias for backward compatibility
  isFree: boolean;
  status?: PublicationStatus;
  chaptersCount?: number;
  duration?: number; // In seconds for audio
  originalLanguage?: string | null;
  copyrightStatus?: string | null;
  authorPageUrl?: string | null;
  characters?: { name: string; description?: string }[] | null;
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
  /** Stable category IDs attached to this book (for homepage category-based filtering). */
  categoryIds: string[];
}

/**
 * Related books response: same-author cards + similar-by-category cards.
 */
export interface RelatedBooksResponse {
  sameAuthor: BookCardModel[];
  similar: BookCardModel[];
}

/**
 * Paginated compact book cards response (homepage / catalog / author).
 */
export interface BookCardsResponse {
  items: BookCardModel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Book overview information
 */
/** Заголовок и описание одной ветки обзора (`BookOverviewSeoEntryDto`). */
export interface BookOverviewSeoEntry {
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface BookOverview {
  id: UUID;
  slug: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  coverImageUrl?: string;
  /** `null`, когда оценок нет: сервис отдаёт `ratings.get(bookId) ?? null`. */
  rating?: number | null;
  publicationYear?: number | null;
  firstPublishedYear?: number | null;
  editionPublishedYear?: number | null;
  language?: SupportedLang;
  categories: Category[];
  tags: Tag[];
  primaryCategoryId?: string | null;
  primaryCategory?: Category | null;
  versions: VersionPreview[];
  createdAt: ISODate;
  updatedAt: ISODate;
  versionIds?: {
    text?: string | null;
    audio?: string | null;
  };
  hasText?: boolean;
  hasAudio?: boolean;
  hasSummary?: boolean;
  /**
   * Только заголовок и описание на каждую ветку: ручка обзора отдаёт
   * `BookOverviewSeoEntryDto` (`metaTitle`, `metaDescription`), а не запись SEO целиком.
   */
  seo?: {
    main?: BookOverviewSeoEntry | null;
    read?: BookOverviewSeoEntry | null;
    listen?: BookOverviewSeoEntry | null;
    summary?: BookOverviewSeoEntry | null;
  } | null;
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
  /** Только `GET /admin/versions/{id}`: остальные маршруты версии слаг книги не собирают. */
  bookSlug?: string;
  language: SupportedLang;
  title: string;
  author: string;
  description?: string;
  coverImageUrl?: string;
  type: VersionType;
  isFree: boolean;
  status: PublicationStatus;
  /** Приходит всегда; `null` у неопубликованной версии (колонка `DateTime?`). */
  publishedAt?: ISODate | null;
  referralUrl?: string | null;
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
  seo?: SeoData | null;
  /** Attached categories */
  categories?: Category[];
  /** Attached tags */
  tags?: Tag[];
  /** Phase 8: Rights content hash */
  rightsContentHash?: string | null;
  rightsContentHashAlgorithmVersion?: string | null;
  rightsContentHashCalculatedAt?: string | null;
  rightsRecheckRequired?: boolean;
  rightsStaleDetectedAt?: string | null;
  rightsStaleReasonCode?: string | null;
  rightsStaleReasonRu?: string | null;
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
  /** Book description: optional at creation, required to publish */
  description?: string;
  /** Book cover URL: optional at creation, required to publish */
  coverImageUrl?: string;
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
  /** Book description: empty string clears it on a draft; a published version keeps its own */
  description?: string;
  /** Book cover URL: empty string clears it on a draft; a published version keeps its own */
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
  /** Колонка `String?`: приходит `null`, а не отсутствие ключа. */
  analysis?: string | null;
  /** Major themes */
  themes?: string | null;
}

/**
 * Request to upsert book summary for a version
 */
export interface UpsertBookSummaryRequest {
  /** Brief overview / summary text */
  summary: string;
  /** Analysis / key takeaways */
  /** Колонка `String?`: приходит `null`, а не отсутствие ключа. */
  analysis?: string;
  /** Major themes */
  themes?: string;
}

/**
 * Ответ `GET /{lang}/books/{slug}/reader-bootstrap` - всё, что нужно читалке одним запросом.
 *
 * Переехал из `api/endpoints/public.ts` 10.09.2026.
 */
export interface ReaderBootstrapChapter {
  id: UUID;
  number: number;
  title: string;
  content: string;
}

export interface ReaderBootstrapResponse {
  bookId: string;
  versionId: string;
  slug: string;
  title: string;
  author: string;
  /**
   * Ровно четыре поля: ручка отдаёт `select: { id, number, title, content }`
   * (`books/src/modules/book/dto/reader-bootstrap-response.dto.ts:11-23`). До 10.09.2026 здесь
   * стоял `ChapterDetail`, обещавший вдобавок `versionId`, `createdAt` и `updatedAt`, которых
   * в ответе нет вовсе.
   */
  chapters: ReaderBootstrapChapter[];
  /** Только у владельца токена: анониму ключа нет вовсе. */
  lastProgress?: {
    chapterNumber?: number | null;
    position: number;
  } | null;
}

/**
 * Книга-контейнер в админских и публичных списках.
 *
 * 🔴 Это **не** `BookOverview`. Контейнер выбирается белым списком
 * `PUBLIC_BOOK_SELECT` = `id, slug, createdAt, updatedAt`
 * (`books/src/common/selects/public-book.select.ts`), а `title`, `author`, `language`,
 * `categories` и `tags` живут на `versions[]`. До 10.09.2026 `GET /books`,
 * `GET /books/{id}` и `GET /{lang}/books` были типизованы `BookOverview`, то есть обещали
 * пять полей, которых в ответе нет вовсе.
 */
export interface BookContainerVersion {
  id: UUID;
  bookId: UUID;
  language: SupportedLang;
  status: PublicationStatus;
  type: VersionType;
  title: string;
  author: string;
  authorId?: UUID | null;
  coverImageUrl: string;
  coverAlt?: string | null;
  description: string;
  shortDescription?: string | null;
  slug?: string | null;
  isFree: boolean;
  publishedAt?: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Версия в списке книг: там же приезжают счётчики содержимого и связи тегов. */
export interface BookListVersion extends BookContainerVersion {
  _count: {
    chapters: number;
    audioChapters: number;
    summaries: number;
  };
  tags: { tag: Tag }[];
}

/** Версия в карточке книги: вместо счётчиков приезжают связи категорий и тегов. */
export interface BookDetailVersion extends BookContainerVersion {
  /** Плоский список: ручка карточки разворачивает связь сама. */
  categories: Category[];
  tags: Tag[];
}

/** Элемент ответа `GET /books` и `GET /{lang}/books`. */
export interface BookListItem {
  id: UUID;
  slug: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  rating?: number | null;
  hasText: boolean;
  hasAudio: boolean;
  hasSummary: boolean;
  versions: BookListVersion[];
}

/** Тело ответа `GET /books/{id}`. */
export interface BookDetailResponse {
  id: UUID;
  slug: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  rating?: number | null;
  versions: BookDetailVersion[];
}
