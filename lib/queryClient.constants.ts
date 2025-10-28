/**
 * Константы для React Query конфигурации
 */

/**
 * Время кэширования данных
 */
export const QUERY_CACHE_TIME = {
  /** Данные считаются свежими 1 минуту */
  STALE_TIME_MS: 60 * 1000,

  /** Кэш хранится 5 минут */
  CACHE_TIME_MS: 5 * 60 * 1000,
} as const;

/**
 * Настройки retry для запросов
 */
export const QUERY_RETRY = {
  /** Количество попыток повтора при ошибке */
  MAX_RETRIES: 3,

  /** Задержка между попытками (мс) */
  RETRY_DELAY_MS: 1000,
} as const;
