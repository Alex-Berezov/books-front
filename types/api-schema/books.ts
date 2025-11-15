/**
 * Types for Books endpoints
 *
 * Books, versions, book containers
 */

import type { Category } from './categories';
import type { Chapter } from './chapters';
import type { ISODate, PublicationStatus, SupportedLang, UUID, VersionType } from './common';
import type { Tag } from './tags';

/**
 * Book version preview
 */
export interface VersionPreview {
  id: UUID;
  type: VersionType;
  title?: string;
  isFree: boolean;
  chaptersCount: number;
  duration?: number; // In seconds for audio
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
  rating?: number;
  publicationYear?: number;
  language: SupportedLang;
  categories: Category[];
  tags: Tag[];
  versions: VersionPreview[];
  createdAt: ISODate;
  updatedAt: ISODate;
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
  seo: {
    metaTitle?: string;
    metaDescription?: string;
  };
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
  /** SEO meta title */
  seoMetaTitle?: string;
  /** SEO meta description */
  seoMetaDescription?: string;
}

/**
 * Request to update book version
 */
export interface UpdateBookVersionRequest {
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
  /** SEO meta title */
  seoMetaTitle?: string;
  /** SEO meta description */
  seoMetaDescription?: string;
}
