/**
 * WP-M.2: текст отказа действия над статусом интейка.
 *
 * Живёт отдельным файлом ровно затем, чтобы его можно было проверить тестом: страница —
 * клиентский компонент с четырьмя хуками мутаций, и сам разбор ошибки в ней теряется.
 */

/** Какое действие отказало. Панель манифеста показывает только свой отказ, шапка — остальные. */
export type StatusActionScope = 'markReady' | 'returnToDraft' | 'archive';

export interface StatusActionError {
  scope: StatusActionScope;
  message: string;
}

/**
 * Сообщение бэкенда информативнее любого нашего текста: `Cannot transition from 'DRAFT' to
 * 'APPROVED'` называет причину, «не удалось» — нет. Запасной текст берётся только когда своего
 * сообщения нет вовсе: у отброшенного значения, не являющегося `Error`, и у `Error` с пустым
 * `message` (так выглядит, например, оборванная сеть в части браузеров).
 */
export const describeStatusFailure = (
  scope: StatusActionScope,
  err: unknown,
  fallback: string
): StatusActionError => ({
  scope,
  message: err instanceof Error && err.message.trim() !== '' ? err.message : fallback,
});
