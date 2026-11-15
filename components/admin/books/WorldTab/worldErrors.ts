import { errorCode, errorText } from '@/lib/admin/request-errors';
import type { BookWorldEditor, BookWorldEntitySummary } from '@/types/api-schema';

/** Текст отказа ручки мира книги: строки проверки сервера как есть (`lib/admin/request-errors.ts`). */
export const worldErrorText = (error: unknown): string => errorText(error, 'Request failed');

/** Отметка «прочитано»: текста модели нет, он прочитан после последней записи или нет. */
export type WorldReadState = 'none' | 'read' | 'unread';

/** Прочитано, если отметка не раньше последней записи модели (`readAt >= autoTextAt`), как на бэкенде. */
export const worldReadState = (editor: BookWorldEditor): WorldReadState => {
  if (!editor.autoTextAt) return 'none';
  if (!editor.readAt) return 'unread';
  return Date.parse(editor.readAt) >= Date.parse(editor.autoTextAt) ? 'read' : 'unread';
};

const READ_LABELS: Record<WorldReadState, string> = {
  none: 'No model text',
  read: 'Read',
  unread: 'Not read',
};

/** Подпись состояния «прочитано» — одна для списка и карточки. */
export const worldReadLabel = (editor: BookWorldEditor): string =>
  READ_LABELS[worldReadState(editor)];

const READ_ERRORS: Record<string, string> = {
  AUTO_TEXT_NONE: 'There is no model text to mark as read.',
  WORLD_TEXT_CHANGED:
    'The model text changed after the list was loaded: the list is reloaded, review the entity and mark it again.',
};

const DELETE_ERRORS: Record<string, string> = {
  WORLD_ENTITY_PUBLISHED:
    'The entity is or was public on the site and cannot be deleted: turn off «Visible» instead.',
  WORLD_ENTITY_REFERENCED:
    'Other entities refer to this one (relations or quote speakers): remove those references first.',
};

export const worldReadErrorText = (error: unknown): string =>
  READ_ERRORS[errorCode(error) ?? ''] ?? `Could not mark as read: ${worldErrorText(error)}`;

export const worldDeleteErrorText = (error: unknown): string =>
  DELETE_ERRORS[errorCode(error) ?? ''] ?? `Could not delete: ${worldErrorText(error)}`;

/**
 * Ручная правка или импорт сущности, которая была на сайте, снимает её страницу до отметки
 * «прочитано» (решение арбитра `F08 | F08-1` R9, круг 2). Была ли — `firstPublishedAt`: он
 * ставится, как только сущность публична, и не сбрасывается (R2).
 */
export const WORLD_HIDDEN_UNTIL_READ =
  'After saving, the page is hidden until an admin marks it read.';

export const isWorldPublished = (
  entity: Pick<BookWorldEntitySummary, 'editor'> | null | undefined
) => !!entity?.editor?.firstPublishedAt;

/** Сообщение, когда ключ новой сущности уже занят (409 `RECORD_CHANGED` при `expectedAbsent`). */
export const WORLD_KEY_TAKEN = 'key is taken';
