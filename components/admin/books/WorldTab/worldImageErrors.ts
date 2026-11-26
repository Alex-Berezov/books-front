import { refusalTextOfCode } from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { worldImageFileLimitsOf } from '@/lib/admin/book-world-blocks';
import { errorCode, errorText } from '@/lib/admin/request-errors';

// Пределы - одной формой (`worldImageFileLimitsOf`): у портрета и у места одни поля.
const L = worldImageFileLimitsOf('character');
const P = worldImageFileLimitsOf('place');

/** Кому положена иллюстрация (F08-12c-2): и подсказка панели, и текст отказа 409. */
export const WORLD_IMAGE_NOT_ALLOWED_TEXT =
  'Only places and main or secondary characters get an illustration.';

/** Ключ занят картинкой сущности другого типа (F08-12c-2): и подсказка панели, и текст отказа 409. */
export const WORLD_IMAGE_KEY_CONFLICT_TEXT =
  'This key already holds the illustration of another entity (a character or a place with the same key in another version of the book). It is freed when that entity loses the right to an illustration in every version: set the character role below secondary, or delete that entity or change its type.';

/** Свои коды ручек «Accept» и загрузки файла; общие отказы — общим текстом. */
const REQUEST_ERRORS: Record<string, string> = {
  WORLD_IMAGE_NOT_ALLOWED: WORLD_IMAGE_NOT_ALLOWED_TEXT,
  WORLD_IMAGE_ENTITY_CHANGED:
    'The entity type changed meanwhile: the card was reloaded, try again.',
  WORLD_IMAGE_KEY_CONFLICT: WORLD_IMAGE_KEY_CONFLICT_TEXT,
  WORLD_IMAGE_NOT_IMAGE: 'The file is not a PNG, JPEG or WebP image.',
  WORLD_IMAGE_TOO_LARGE: `The image is too large: up to ${L.maxMb} MB and ${L.maxMegapixels} megapixels.`,
  WORLD_IMAGE_TOO_SMALL: `The image is too small: a character needs at least ${L.minWidth}×${L.minHeight} px, a place at least ${P.minWidth}×${P.minHeight} px.`,
  WORLD_IMAGE_NONE: 'There is no illustration waiting for Accept.',
  WORLD_IMAGE_CHANGED: 'The illustration was replaced meanwhile: check the new one and accept it.',
};

/** «Слишком мало» по типу сущности: панель знает тип - называется только его предел (F08-12c-2). */
const tooSmallOf = (entityType: string): string => {
  const { minWidth, minHeight } = worldImageFileLimitsOf(entityType);
  return `The image is too small: at least ${minWidth}×${minHeight} px.`;
};

/**
 * Отказ ручки иллюстрации: известный код — фраза, иначе строки сервера как есть. Тип сущности
 * известен — отказ по размеру называет только её предел.
 */
export const worldImageRequestErrorText = (error: unknown, entityType?: string): string => {
  const code = errorCode(error) ?? '';
  if (code === 'WORLD_IMAGE_TOO_SMALL' && entityType) return tooSmallOf(entityType);
  return REQUEST_ERRORS[code] ?? refusalTextOfCode(code) ?? errorText(error, 'Request failed');
};
