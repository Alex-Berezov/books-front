/**
 * Расширенный HTTP клиент с поддержкой NextAuth и retry логики
 *
 * Возможности:
 * - Автоматическое получение токена из NextAuth
 * - Обработка 401 с автоматическим refresh
 * - Retry логика для временных ошибок
 * - Интеграция с языками
 *
 * @module http-client
 */

export type { ExtendedHttpOptions } from './types';
export { getCurrentSession, getAccessToken, handleAuthFailure } from './auth';
export { withAuthRetry } from './retry';
export { httpGetAuth, httpPostAuth, httpPatchAuth, httpDeleteAuth } from './methods';

/**
 * Type guard для проверки ApiError
 */
import { ApiError } from '@/types/api';

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};
