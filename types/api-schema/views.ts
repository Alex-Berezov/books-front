/**
 * Types for view tracking endpoint.
 *
 * `POST /views` records a view for analytics. See books-app-docs/frontend/features/audio-feature/FRONTEND_ITER2_CONTRACT.md §7.1.
 * Anonymous views are allowed; authenticated views attach the user automatically.
 */

import type { UUID } from './common';

/**
 * View source enum (backend ENUM).
 * - `reader`   — text reader
 * - `audio`    — audio player
 * - `referral` — referral link opened
 */
export type ViewSource = 'reader' | 'audio' | 'referral';

/**
 * Request body for `POST /views`.
 */
export interface RecordViewRequest {
  versionId: UUID;
  source: ViewSource;
}
