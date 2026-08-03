/**
 * WP-H: отказ создания книги несёт машинный код. Редактор должен видеть причину, а не английскую
 * строку сервера, и не пустоту, когда код бэкенду уже известен, а фронту ещё нет.
 *
 * Набор кодов расширяется аддитивно (`rights-book-creation.constants.ts`), поэтому список здесь
 * заведомо неполон: незнакомый код показывается русским сообщением самого бэкенда, а если и его
 * нет — сообщением исключения. Пустую строку функция не возвращает никогда.
 */
export const BOOK_CREATION_ERROR_LABELS: Record<string, string> = {
  BOOK_CREATION_INTAKE_NOT_FOUND: 'Проверка прав не найдена',
  BOOK_CREATION_INTAKE_NOT_APPROVED: 'Проверка прав ещё не утверждена',
  BOOK_CREATION_INTAKE_HAS_NO_APPROVED_REVIEW: 'У проверки нет утверждённого отчёта',
  BOOK_CREATION_BOOK_ALREADY_CREATED: 'Книга по этой проверке уже создана',
  BOOK_CREATION_APPROVED_REVIEW_NOT_FOUND: 'Утверждённый отчёт не найден',
  BOOK_CREATION_REVIEW_NOT_APPROVED: 'Отчёт не утверждён человеком',
  BOOK_CREATION_PROFILE_NOT_CURRENT: 'Профиль прав не является действующим',
  BOOK_CREATION_PROFILE_NOT_APPROVED: 'Профиль прав не утверждён',
  BOOK_CREATION_PROFILE_INTAKE_MISMATCH: 'Профиль прав принадлежит другой проверке',
  BOOK_CREATION_PUBLICATION_GATE_BLOCK: 'Публикация запрещена по результатам проверки',
  BOOK_CREATION_SLUG_TAKEN: 'Книга с таким слагом уже существует',
  BOOK_CREATION_LANGUAGE_NOT_TARGETED: 'Язык версии не входит в целевые языки проверки',
  // WP-L.2: привязка клиренса к существующей книге.
  BOOK_CREATION_BOOK_NOT_FOUND: 'Книга с таким слагом не найдена',
  BOOK_CREATION_BOOK_ALREADY_UNDER_CLEARANCE: 'К этой книге уже привязан другой профиль прав',
  BOOK_CREATION_VERSIONS_NOT_ALLOWED_WHEN_ATTACHING:
    'При привязке к существующей книге версии не передаются',
  BOOK_CREATION_NO_VERSIONS_IN_TARGET_LANGUAGES:
    'У книги нет версий на целевых языках этой проверки',
};

/** Последний рубеж: сообщение показывается всегда, даже когда сервер не сказал ничего внятного. */
export const BOOK_CREATION_FALLBACK_MESSAGE = 'Не удалось создать книгу';

export interface BookCreationErrorBody {
  code?: string;
  messageRu?: string;
}

export const bookCreationErrorMessage = (
  body?: BookCreationErrorBody,
  exceptionMessage?: string
): string => {
  const known = body?.code ? BOOK_CREATION_ERROR_LABELS[body.code] : undefined;
  return known || body?.messageRu || exceptionMessage || BOOK_CREATION_FALLBACK_MESSAGE;
};
