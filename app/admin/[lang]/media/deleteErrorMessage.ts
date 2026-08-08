import { ApiError } from '@/types/api';

/**
 * Текст отказа при удалении файла из медиатеки.
 *
 * Бэкенд отвечает 409 и перечисляет, что именно ссылается на объект (LEGACY-060):
 * обложка версии книги, аудио главы, аватар пользователя, фото автора. Показать
 * вместо этого «Failed to delete file» — значит сообщить оператору, что что-то
 * пошло не так, и не сообщить, что с этим делать.
 */
const isReferenceList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const deleteErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) return 'Failed to delete file';

  const references = error.data?.references;
  if (error.statusCode === 409 && isReferenceList(references) && references.length > 0) {
    return `${error.message}: ${references.join(', ')}`;
  }

  // Сообщение сервера, если оно есть: оно точнее любого нашего обобщения.
  return error.message || 'Failed to delete file';
};
