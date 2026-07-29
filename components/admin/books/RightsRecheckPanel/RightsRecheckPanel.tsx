'use client';

import { useState, type FC } from 'react';
import { CalendarClock } from 'lucide-react';
import {
  useCompleteRightsRecheckTask,
  useDismissRightsRecheckTask,
  useSnoozeRightsRecheckTask,
  useVersionRecheck,
} from '@/api/hooks/useRightsRecheck';
import type { RightsRecheckTask } from '@/types/api-schema/rights-recheck';
import styles from './RightsRecheckPanel.module.scss';

export interface RightsRecheckPanelProps {
  versionId: string;
}

type ModalKind = 'complete' | 'dismiss' | 'snooze' | null;

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString() : '—';

export const RightsRecheckPanel: FC<RightsRecheckPanelProps> = ({ versionId }) => {
  const [modal, setModal] = useState<ModalKind>(null);
  const [activeTask, setActiveTask] = useState<RightsRecheckTask | null>(null);
  const [notes, setNotes] = useState('');
  const [dismissReason, setDismissReason] = useState('');
  const [snoozeUntil, setSnoozeUntil] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const recheckQuery = useVersionRecheck(versionId);
  const completeMutation = useCompleteRightsRecheckTask();
  const dismissMutation = useDismissRightsRecheckTask();
  const snoozeMutation = useSnoozeRightsRecheckTask();

  const evaluation = recheckQuery.data ?? null;
  const tasks = evaluation?.tasks ?? [];
  const blockers = evaluation?.blockers ?? [];
  const warnings = evaluation?.warnings ?? [];

  const closeModal = () => {
    setModal(null);
    setActiveTask(null);
    setNotes('');
    setDismissReason('');
    setSnoozeUntil('');
    setFormError(null);
  };

  const handleComplete = async () => {
    if (!activeTask) return;
    setFormError(null);
    try {
      await completeMutation.mutateAsync({
        taskId: activeTask.id,
        data: { notesRu: notes.trim() || undefined },
      });
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось закрыть задачу.');
    }
  };

  const handleDismiss = async () => {
    if (!activeTask || dismissReason.trim().length < 3) {
      setFormError('Укажите причину отклонения (минимум 3 символа).');
      return;
    }
    setFormError(null);
    try {
      await dismissMutation.mutateAsync({
        taskId: activeTask.id,
        data: { reasonRu: dismissReason.trim() },
      });
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось отклонить задачу.');
    }
  };

  const handleSnooze = async () => {
    if (!activeTask || !snoozeUntil) {
      setFormError('Укажите дату, до которой отложить напоминания.');
      return;
    }
    setFormError(null);
    try {
      await snoozeMutation.mutateAsync({
        taskId: activeTask.id,
        data: { until: new Date(snoozeUntil).toISOString() },
      });
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось отложить задачу.');
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <CalendarClock size={16} />
        <h3 className={styles.title}>Перепроверка прав</h3>
      </div>

      {evaluation && evaluation.openTasksCount === 0 ? (
        <p className={styles.statusLine}>
          Перепроверка не требуется.
          {evaluation.schedule?.computedDueAt
            ? ` Следующая плановая проверка: ${formatDate(evaluation.schedule.computedDueAt)}.`
            : ''}
        </p>
      ) : (
        <p className={styles.statusLine}>
          Открытых задач: {evaluation?.openTasksCount ?? 0}, просрочено:{' '}
          <span className={(evaluation?.overdueTasksCount ?? 0) > 0 ? styles.overdue : undefined}>
            {evaluation?.overdueTasksCount ?? 0}
          </span>
          {evaluation?.nextRecheckDueAt
            ? ` · ближайший срок: ${formatDate(evaluation.nextRecheckDueAt)}`
            : ''}
        </p>
      )}

      {(blockers.length > 0 || warnings.length > 0) && (
        <ul className={styles.reasonList}>
          {blockers.map((reason) => (
            <li key={`${reason.code}-${reason.taskId ?? 'none'}`} className={styles.reasonBlocker}>
              <span className={styles.reasonCode}>{reason.code}</span>
              <span>{reason.messageRu}</span>
            </li>
          ))}
          {warnings.map((reason) => (
            <li key={`${reason.code}-${reason.taskId ?? 'none'}`} className={styles.reasonWarning}>
              <span className={styles.reasonCode}>{reason.code}</span>
              <span>{reason.messageRu}</span>
            </li>
          ))}
        </ul>
      )}

      {tasks.length === 0 ? (
        <p className={styles.emptyState}>Задач перепроверки по этой версии нет.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Критичность</th>
                <th>Причина</th>
                <th>Задача</th>
                <th>Срок</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <span className={styles.badge} data-severity={task.effectiveSeverity}>
                      {task.effectiveSeverity}
                    </span>
                  </td>
                  <td>{task.reasonRu}</td>
                  <td className={styles.titleCell}>{task.titleRu}</td>
                  <td className={task.isOverdue ? styles.overdue : undefined}>
                    {formatDate(task.dueAt)}
                  </td>
                  <td>{task.status}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => {
                          setActiveTask(task);
                          setModal('complete');
                        }}
                      >
                        Complete
                      </button>
                      <button
                        className={styles.actionBtn}
                        onClick={() => {
                          setActiveTask(task);
                          setModal('snooze');
                        }}
                      >
                        Snooze
                      </button>
                      <button
                        className={styles.actionBtnDanger}
                        onClick={() => {
                          setActiveTask(task);
                          setModal('dismiss');
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'complete' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Закрыть задачу перепроверки</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="version-recheck-notes">
                Заметка
              </label>
              <textarea
                id="version-recheck-notes"
                className={styles.textArea}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.actionBtn} onClick={closeModal}>
                Отмена
              </button>
              <button
                className={styles.actionBtn}
                onClick={handleComplete}
                disabled={completeMutation.isPending}
              >
                Закрыть задачу
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'dismiss' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Отклонить задачу перепроверки</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="version-recheck-dismiss-reason">
                Причина (обязательно)
              </label>
              <textarea
                id="version-recheck-dismiss-reason"
                className={styles.textArea}
                value={dismissReason}
                onChange={(event) => setDismissReason(event.target.value)}
              />
            </div>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.actionBtn} onClick={closeModal}>
                Отмена
              </button>
              <button
                className={styles.actionBtnDanger}
                onClick={handleDismiss}
                disabled={dismissMutation.isPending}
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'snooze' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Отложить напоминания</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="version-recheck-snooze-until">
                Отложить до
              </label>
              <input
                id="version-recheck-snooze-until"
                className={styles.textInput}
                type="date"
                value={snoozeUntil}
                onChange={(event) => setSnoozeUntil(event.target.value)}
              />
            </div>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.actionBtn} onClick={closeModal}>
                Отмена
              </button>
              <button
                className={styles.actionBtn}
                onClick={handleSnooze}
                disabled={snoozeMutation.isPending}
              >
                Отложить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
