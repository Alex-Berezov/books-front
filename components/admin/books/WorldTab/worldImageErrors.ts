import { refusalTextOfCode } from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { errorCode, errorText } from '@/lib/admin/request-errors';

/** Свои коды ручки «Accept»; общие отказы — общим текстом. */
const REQUEST_ERRORS: Record<string, string> = {
  WORLD_IMAGE_NOT_ALLOWED: 'Only main and secondary characters get an illustration.',
  WORLD_IMAGE_NONE: 'There is no illustration waiting for Accept.',
  WORLD_IMAGE_CHANGED: 'The illustration was replaced meanwhile: check the new one and accept it.',
};

/** Отказ ручки иллюстрации: известный код — фраза, иначе строки сервера как есть. */
export const worldImageRequestErrorText = (error: unknown): string => {
  const code = errorCode(error) ?? '';
  return REQUEST_ERRORS[code] ?? refusalTextOfCode(code) ?? errorText(error, 'Request failed');
};
