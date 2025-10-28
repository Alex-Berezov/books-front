/**
 * Константы для middleware
 */

/**
 * Регулярное выражение для извлечения языка из админ пути
 */
export const ADMIN_LANG_REGEX = /^\/admin\/([a-z]{2})/;

/**
 * Язык по умолчанию для редиректов
 */
export const DEFAULT_REDIRECT_LANG = 'en' as const;
