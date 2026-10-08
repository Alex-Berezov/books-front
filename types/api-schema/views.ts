/**
 * Types for view tracking endpoint.
 *
 * `POST /views` records a view for analytics. See `books-app-docs/ai-context/api-contracts.md` («User-facing data endpoints»)
 * Anonymous views are allowed; authenticated views attach the user automatically.
 */

import type { UUID } from './common';

/**
 * View source enum (backend ENUM).
 * - `text`     — text reader
 * - `audio`    — audio player
 * - `referral` — referral link opened
 */
export type ViewSource = 'text' | 'audio' | 'referral';

/**
 * Request body for `POST /views`.
 */
export interface RecordViewRequest {
  versionId: UUID;
  source: ViewSource;
}

/**
 * Ответ `POST /views` — `CreateViewResponseDto`.
 */
export interface CreateViewResponse {
  success: boolean;
}
