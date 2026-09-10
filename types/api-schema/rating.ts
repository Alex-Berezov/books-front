/**
 * Оценки книг: тело ответа `POST /books/{id}/rate` и `GET /books/{id}/my-rating`.
 *
 * Формы переехали из `api/endpoints/rating.ts` 10.09.2026: слой 2 гейта
 * `check:type-sync` достаёт тип вызова только через барель `types/api-schema`,
 * и форма, объявленная в модуле вызовов, под утверждения не попадает вовсе.
 */

import type { UUID } from './common';

export interface RateBookResponse {
  id: UUID;
  userId: UUID;
  bookId: UUID;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserRatingResponse {
  score?: number | null;
}
