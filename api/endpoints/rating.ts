/**
 * Rating API endpoints
 */

import { httpPostAuth } from '@/lib/http-client';
import type { UUID } from '@/types/api-schema/common';

export interface RateBookResponse {
  id: UUID;
  userId: UUID;
  bookId: UUID;
  score: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Submit rating for a book
 *
 * @param bookId - Book ID
 * @param score - Score from 1 to 5
 */
export const rateBook = async (bookId: string, score: number): Promise<RateBookResponse> => {
  const endpoint = `/books/${bookId}/rate`;
  return httpPostAuth<RateBookResponse>(endpoint, { score });
};
