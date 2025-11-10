/**
 * Типы для HTTP клиента с автоматической авторизацией
 */

import type { HttpRequestOptions } from '@/types/api';

/**
 * Расширенные опции для HTTP запросов
 */
export interface ExtendedHttpOptions extends HttpRequestOptions {
  /** Требуется ли автоматическая авторизация */
  requireAuth?: boolean;
  /** Максимальное количество попыток retry */
  maxRetries?: number;
  /** Включить retry при 401 (автоматический refresh) */
  retry401?: boolean;
}
