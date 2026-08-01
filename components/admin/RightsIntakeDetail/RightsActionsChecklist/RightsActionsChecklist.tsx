'use client';

import { useState, type FC } from 'react';
import { useUpdateRightsAction } from '@/api/hooks/useRightsIntakes';
import type { RightsAction } from '@/types/api-schema/rights-intake';
import styles from './RightsActionsChecklist.module.scss';

export interface RightsActionsChecklistProps {
  actions: RightsAction[];
}

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString('ru-RU') : '—';

const formatCountries = (value: unknown): string =>
  Array.isArray(value) && value.length > 0 ? (value as string[]).join(', ') : '—';

/**
 * WP-5.4 — чеклист обязательных действий клиренса.
 *
 * До WP-5 действие можно было только прочитать: статус писался единственный раз при
 * материализации отчёта агента и не изменялся нигде, поэтому интейк с блокирующим
 * действием было невозможно ни утвердить, ни превратить в книгу (R3-02). Здесь редактор
 * отмечает выполнение — и это единственный способ закрыть действие.
 */
export const RightsActionsChecklist: FC<RightsActionsChecklistProps> = ({ actions }) => {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const updateAction = useUpdateRightsAction();

  const openBlocking = actions.filter((action) => action.isBlocking && !action.isResolved);
  const resolvedCount = actions.filter((action) => action.isResolved).length;

  const submit = async (action: RightsAction, status: string) => {
    setPendingActionId(action.id);
    try {
      await updateAction.mutateAsync({
        actionId: action.id,
        data: {
          status,
          ...(notes[action.id]?.trim() ? { completionNotesRu: notes[action.id].trim() } : {}),
        },
      });
      setNotes((prev) => ({ ...prev, [action.id]: '' }));
    } catch {
      // ошибка показывается ниже из состояния мутации
    } finally {
      setPendingActionId(null);
    }
  };

  if (actions.length === 0) {
    return <p className={styles.emptyState}>Обязательных действий нет.</p>;
  }

  return (
    <div className={styles.checklist}>
      <p className={styles.summary}>
        Выполнено {resolvedCount} из {actions.length}
        {openBlocking.length > 0
          ? `; блокируют публикацию: ${openBlocking.length}`
          : '; блокирующих действий не осталось'}
      </p>

      <ul className={styles.list}>
        {actions.map((action) => {
          const busy = pendingActionId === action.id && updateAction.isPending;
          // Отказ от действия — решение, а не отметка: сервер требует комментарий.
          const waiveNote = notes[action.id]?.trim() ?? '';

          return (
            <li
              key={action.id}
              className={
                action.isBlocking && !action.isResolved
                  ? `${styles.item} ${styles.itemBlocking}`
                  : styles.item
              }
            >
              <div className={styles.itemHeader}>
                <span className={styles.checkbox}>{action.isResolved ? '☑' : '☐'}</span>
                <span className={styles.itemTitle}>{action.actionType}</span>
                <span className={styles.badge} data-status={action.status}>
                  {action.status}
                </span>
                {action.isBlocking && (
                  <span className={styles.badge} data-tone="blocking">
                    Блокирует публикацию
                  </span>
                )}
              </div>

              <p className={styles.itemDescription}>{action.descriptionRu}</p>
              <p className={styles.itemMeta}>
                Страны: {formatCountries(action.affectedCountryCodes)}
                {action.dueAt ? ` · Срок: ${formatDate(action.dueAt)}` : ''}
                {action.completedAt ? ` · Закрыто: ${formatDate(action.completedAt)}` : ''}
                {action.completionNotesRu ? ` · ${action.completionNotesRu}` : ''}
              </p>

              <div className={styles.itemActions}>
                {action.isResolved ? (
                  <button
                    type="button"
                    className={styles.actionBtnSecondary}
                    disabled={busy}
                    onClick={() => void submit(action, 'PENDING')}
                  >
                    Открыть заново
                  </button>
                ) : (
                  <>
                    <input
                      type="text"
                      className={styles.noteInput}
                      placeholder="Комментарий (обязателен для отказа)"
                      value={notes[action.id] ?? ''}
                      onChange={(event) =>
                        setNotes((prev) => ({ ...prev, [action.id]: event.target.value }))
                      }
                    />
                    {action.status !== 'IN_PROGRESS' && (
                      <button
                        type="button"
                        className={styles.actionBtnSecondary}
                        disabled={busy}
                        onClick={() => void submit(action, 'IN_PROGRESS')}
                      >
                        В работе
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.actionBtnPrimary}
                      disabled={busy}
                      onClick={() => void submit(action, 'COMPLETED')}
                    >
                      Выполнено
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtnSecondary}
                      disabled={busy || !waiveNote}
                      onClick={() => void submit(action, 'WAIVED')}
                    >
                      Отказаться
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className={styles.hint}>
        Закрытие действия на удаление или замену компонента пересчитывает решения по странам: рынок,
        закрытый только этим компонентом, открывается.
      </p>

      {updateAction.error && (
        <p className={styles.errorText}>
          {updateAction.error instanceof Error
            ? updateAction.error.message
            : 'Не удалось изменить действие'}
        </p>
      )}
    </div>
  );
};
