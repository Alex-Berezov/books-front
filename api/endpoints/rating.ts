/**
 * Rating API endpoints
 */

import { httpPostAuth, httpGetAuth } from '@/lib/http-client';
import type { RateBookResponse, UserRatingResponse } from '@/types/api-schema';

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

/**
 * Get current user rating for a book
 *
 * @param bookId - Book ID
 */
export const getUserBookRating = async (bookId: string): Promise<UserRatingResponse> => {
  const endpoint = `/books/${bookId}/my-rating`;
  return httpGetAuth<UserRatingResponse>(endpoint);
};
