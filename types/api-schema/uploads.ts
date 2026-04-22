/**
 * Types for Uploads and MediaAsset endpoints
 *
 * See `FRONTEND_ITER2_CONTRACT.md` §4 (MediaAsset) and §4.3-4.4 (upload flow).
 */

import type { ISODate, UUID } from './common';

/**
 * Raw MediaAsset entity as returned by the backend.
 *
 * This is the low-level DTO used by upload endpoints. The admin media library
 * maps it to the camel-cased `MediaFile` shape (see `./media.ts`).
 */
export interface MediaAsset {
  id: UUID;
  key: string;
  url: string;
  contentType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  /** Duration in seconds (ffprobe, audio/video only). May be null right after confirm. */
  duration: number | null;
  createdAt: ISODate;
  createdById: UUID;
  isDeleted: boolean;
  deletedAt: ISODate | null;
}

/**
 * Size and MIME whitelist for a single upload category.
 */
export interface UploadLimitsCategory {
  maxSizeMb: number;
  allowedContentTypes: string[];
}

/**
 * Response of `GET /uploads/limits` (public, cacheable per session).
 */
export interface UploadLimits {
  image: UploadLimitsCategory;
  audio: UploadLimitsCategory;
  /** Presigned-upload token TTL in seconds. */
  presignTtlSec: number;
}

/**
 * Request body for `POST /uploads/presign`.
 */
export interface PresignUploadRequest {
  /** Target storage key. Backend may adjust/namespace it. */
  key: string;
  contentType: string;
  size: number;
}

/**
 * Response of `POST /uploads/presign`.
 */
export interface PresignUploadResponse {
  /** Short-lived Bearer token scoped to the upload URL (used in `/uploads/direct`). */
  token: string;
  /** Absolute URL to PUT/POST the binary body to. */
  url: string;
  /** Final storage key (may differ from the requested one). */
  key: string;
}

/**
 * Request body for `POST /media/confirm`.
 */
export interface ConfirmUploadRequest {
  key: string;
  contentType: string;
  size: number;
}
