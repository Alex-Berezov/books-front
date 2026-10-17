/**
 * Якоря разделов страницы книги, на которые ведут ссылки с подстраниц (пересказ, позже разбор
 * и анализ). Одно место на `id` секций (`BookExtraDetails`) и на ссылки: переименуют `id` - ссылки
 * не перестанут прокручивать молча.
 */
export const BOOK_ANCHORS = {
  characters: 'characters',
  symbols: 'symbols',
  quotes: 'quotes',
} as const;
