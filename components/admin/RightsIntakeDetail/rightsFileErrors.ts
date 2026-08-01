import { ApiError } from '@/types/api';

/**
 * WP-9: человекочитаемые сообщения для кодов ошибок приватного файлового хранилища.
 *
 * Бэкенд отвечает телом `{ message, code }`. Без этой карты редактор видел бы либо «Failed to
 * fetch», либо русский текст бэкенда, который меняется вместе с сервером; коды же — часть
 * контракта, поэтому подписи держатся здесь, рядом с панелями прав.
 */
export const RIGHTS_FILE_ERROR_MESSAGES: Record<string, string> = {
  FILE_REQUIRED: 'Файл не выбран.',
  FILE_UNREADABLE: 'Не удалось прочитать загруженный файл. Попробуйте выбрать его заново.',
  REPORT_PDF_ALREADY_UPLOADED:
    'PDF-отчёт уже загружен. Замена запрещена: исправленный отчёт загружается новым импортом.',
  REPORT_PDF_NOT_UPLOADED: 'PDF-отчёт для этого импорта не загружен.',
  REVIEW_IMPORT_NOT_FOUND: 'Импорт отчёта не найден.',
  SOURCE_EDITION_NOT_FOUND: 'У профиля прав нет исходного издания.',
  SOURCE_FILE_ALREADY_UPLOADED:
    'Файл источника уже загружен. Замена запрещена: она сделала бы недействительным клиренс, снятый с прежнего файла.',
  SOURCE_FILE_NOT_UPLOADED: 'Файл источника не загружен.',
  EVIDENCE_NOT_FOUND: 'Доказательство не найдено.',
  EVIDENCE_ARCHIVE_ALREADY_UPLOADED:
    'Архивная копия уже загружена. Замена запрещена: заведите новое доказательство и пометьте им прежнее как заменённое.',
  EVIDENCE_ARCHIVE_NOT_UPLOADED: 'Архивная копия доказательства не загружена.',
  EVIDENCE_SELF_SUPERSESSION: 'Доказательство не может заменять само себя.',
  EVIDENCE_PROFILE_MISMATCH: 'Заменяющее доказательство должно принадлежать тому же профилю прав.',
  EVIDENCE_ALREADY_SUPERSEDED: 'Это доказательство уже помечено заменённым.',
  RIGHTS_FILE_OBJECT_MISSING:
    'Файл числится в базе, но отсутствует в хранилище. Обратитесь к администратору.',
};

/** Статусы, у которых нет кода в теле: лимит и тип файла проверяются до прикладного слоя. */
const STATUS_MESSAGES: Record<number, string> = {
  401: 'Сессия истекла. Войдите заново и повторите загрузку.',
  403: 'Недостаточно прав: юридические файлы доступны ролям Admin и Content Manager.',
  413: 'Файл больше допустимого размера. Уменьшите его или разбейте на части.',
  415: 'Такой тип файла не принимается. Проверьте формат — PDF-отчёт принимается только как application/pdf.',
  429: 'Слишком много запросов. Подождите и повторите загрузку.',
};

const DEFAULT_MESSAGE = 'Не удалось выполнить операцию с файлом. Попробуйте ещё раз.';

/** Достаёт код ошибки из тела ответа: он лежит в `data.code`, а после fetch — ещё и в `error`. */
const extractCode = (error: ApiError): string | undefined => {
  const fromBody = error.data?.code;
  if (typeof fromBody === 'string') return fromBody;
  return typeof error.error === 'string' ? error.error : undefined;
};

/**
 * Превращает ошибку загрузки/скачивания юридического файла в текст для редактора.
 */
export const getRightsFileErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    const code = extractCode(error);
    if (code && RIGHTS_FILE_ERROR_MESSAGES[code]) {
      return RIGHTS_FILE_ERROR_MESSAGES[code];
    }
    if (STATUS_MESSAGES[error.statusCode]) {
      return STATUS_MESSAGES[error.statusCode];
    }
    return error.message || DEFAULT_MESSAGE;
  }

  if (error instanceof Error) {
    // Сетевой сбой доходит сюда как TypeError('Failed to fetch') — показывать его нельзя.
    return error.message === 'Failed to fetch'
      ? 'Сервер недоступен. Проверьте соединение и повторите попытку.'
      : error.message || DEFAULT_MESSAGE;
  }

  return DEFAULT_MESSAGE;
};
