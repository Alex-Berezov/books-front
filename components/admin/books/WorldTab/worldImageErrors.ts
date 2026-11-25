import { refusalTextOfCode } from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { WORLD_IMAGE_FILE_LIMITS } from '@/lib/admin/book-world-blocks';
import { errorCode, errorText } from '@/lib/admin/request-errors';

const L = WORLD_IMAGE_FILE_LIMITS;

/** Свои коды ручек «Accept» и загрузки файла; общие отказы — общим текстом. */
const REQUEST_ERRORS: Record<string, string> = {
  WORLD_IMAGE_NOT_ALLOWED: 'Only main and secondary characters get an illustration.',
  WORLD_IMAGE_NOT_IMAGE: 'The file is not a PNG, JPEG or WebP image.',
  WORLD_IMAGE_TOO_LARGE: `The image is too large: up to ${L.maxMb} MB and ${L.maxMegapixels} megapixels.`,
  WORLD_IMAGE_TOO_SMALL: `The image is too small: both sides must be at least ${L.minSide} px.`,
  WORLD_IMAGE_NONE: 'There is no illustration waiting for Accept.',
  WORLD_IMAGE_CHANGED: 'The illustration was replaced meanwhile: check the new one and accept it.',
};

/** Отказ ручки иллюстрации: известный код — фраза, иначе строки сервера как есть. */
export const worldImageRequestErrorText = (error: unknown): string => {
  const code = errorCode(error) ?? '';
  return REQUEST_ERRORS[code] ?? refusalTextOfCode(code) ?? errorText(error, 'Request failed');
};
