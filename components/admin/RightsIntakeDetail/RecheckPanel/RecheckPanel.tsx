'use client';

import { useMemo, useState, type FC } from 'react';
import { CalendarClock, PlusCircle } from 'lucide-react';
import {
  useCompleteRightsRecheckTask,
  useDismissRightsRecheckTask,
  useCreateRightsRecheckTask,
  useIntakeRecheckTasks,
  useRecheckSchedule,
  useReopenRightsRecheckTask,
  useSnoozeRightsRecheckTask,
  useStartRightsRecheckTask,
  useUpdateRecheckSchedule,
} from '@/api/hooks/useRightsRecheck';
import type {
  RightsRecheckPolicy,
  RightsRecheckResolution,
  RightsRecheckSeverity,
  RightsRecheckTask,
} from '@/types/api-schema/rights-recheck';
import styles from './RecheckPanel.module.scss';

export interface RecheckPanelProps {
  intakeId: string;
  profileId: string | null;
  workflowStatus: string;
}

type ModalKind = 'complete' | 'dismiss' | 'snooze' | 'create' | null;

const POLICY_OPTIONS: { value: RightsRecheckPolicy; label: string }[] = [
  { value: 'INHERIT_REPORT', label: 'Из отчёта (INHERIT_REPORT)' },
  { value: 'FIXED_INTERVAL', label: 'Фиксированный интервал' },
  { value: 'MANUAL_ONLY', label: 'Только вручную' },
  { value: 'PAUSED', label: 'Приостановлено' },
];

const RESOLUTION_OPTIONS: { value: RightsRecheckResolution; label: string }[] = [
  { value: 'MANUALLY_CLOSED', label: 'Закрыто вручную' },
  { value: 'NEW_REVIEW_APPROVED', label: 'Утверждена новая проверка' },
  { value: 'NO_CHANGE_NEEDED', label: 'Изменений не требуется' },
  { value: 'CONTENT_REVERTED', label: 'Контент возвращён к состоянию clearance' },
  { value: 'OTHER', label: 'Другое' },
];

const SEVERITY_OPTIONS: { value: RightsRecheckSeverity; label: string }[] = [
  { value: 'INFO', label: 'INFO' },
  { value: 'WARNING', label: 'WARNING' },
  { value: 'BLOCKING', label: 'BLOCKING' },
];

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString() : '—';

const formatDateTime = (value: string | null): string =>
  value ? new Date(value).toLocaleString() : '—';

/** `<input type="date">` needs `YYYY-MM-DD`, not a full ISO timestamp. */
const toDateInputValue = (value: string | null): string => (value ? value.slice(0, 10) : '');

const dueLabel = (task: RightsRecheckTask): string => {
  if (task.daysUntilDue < 0) return `просрочено на ${Math.abs(task.daysUntilDue)} дн.`;
  if (task.daysUntilDue === 0) return 'срок сегодня';
  return `осталось ${task.daysUntilDue} дн.`;
};

export const RecheckPanel: FC<RecheckPanelProps> = ({ intakeId, profileId, workflowStatus }) => {
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [policy, setPolicy] = useState<RightsRecheckPolicy>('INHERIT_REPORT');
  const [nextReviewAt, setNextReviewAt] = useState('');
  const [intervalDays, setIntervalDays] = useState('');
  const [pausedUntil, setPausedUntil] = useState('');
  const [pauseReason, setPauseReason] = useState('');

  const [modal, setModal] = useState<ModalKind>(null);
  const [activeTask, setActiveTask] = useState<RightsRecheckTask | null>(null);
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState<RightsRecheckResolution>('MANUALLY_CLOSED');
  const [dismissReason, setDismissReason] = useState('');
  const [snoozeUntil, setSnoozeUntil] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueAt, setNewDueAt] = useState('');
  const [newSeverity, setNewSeverity] = useState<RightsRecheckSeverity>('WARNING');
  const [formError, setFormError] = useState<string | null>(null);

  const tasksQuery = useIntakeRecheckTasks(intakeId, { limit: 100 });
  const scheduleQuery = useRecheckSchedule(profileId ?? '', { enabled: !!profileId });

  const startMutation = useStartRightsRecheckTask();
  const completeMutation = useCompleteRightsRecheckTask();
  const dismissMutation = useDismissRightsRecheckTask();
  const snoozeMutation = useSnoozeRightsRecheckTask();
  const reopenMutation = useReopenRightsRecheckTask();
  const createMutation = useCreateRightsRecheckTask();
  const updateScheduleMutation = useUpdateRecheckSchedule(profileId ?? '');

  const tasks = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data]);
  const openTasks = useMemo(() => tasks.filter((task) => task.isOpen), [tasks]);
  const closedTasks = useMemo(() => tasks.filter((task) => !task.isOpen).slice(0, 10), [tasks]);
  const schedule = scheduleQuery.data ?? null;

  const openScheduleEditor = () => {
    if (schedule) {
      setPolicy(schedule.recheckPolicy);
      setNextReviewAt(toDateInputValue(schedule.nextReviewAt));
      setIntervalDays(schedule.recheckIntervalDays ? String(schedule.recheckIntervalDays) : '');
      setPausedUntil(toDateInputValue(schedule.recheckPausedUntil));
      setPauseReason(schedule.recheckPauseReasonRu ?? '');
    }
    setFormError(null);
    setIsEditingSchedule(true);
  };

  const closeModal = () => {
    setModal(null);
    setActiveTask(null);
    setNotes('');
    setDismissReason('');
    setSnoozeUntil('');
    setNewTitle('');
    setNewDescription('');
    setNewDueAt('');
    setFormError(null);
  };

  const handleSaveSchedule = async () => {
    setFormError(null);
    try {
      await updateScheduleMutation.mutateAsync({
        recheckPolicy: policy,
        nextReviewAt: nextReviewAt ? new Date(nextReviewAt).toISOString() : null,
        recheckIntervalDays: intervalDays ? Number(intervalDays) : null,
        recheckPausedUntil: pausedUntil ? new Date(pausedUntil).toISOString() : null,
        recheckPauseReasonRu: pauseReason.trim() || null,
      });
      setIsEditingSchedule(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось сохранить расписание.');
    }
  };

  const handleComplete = async () => {
    if (!activeTask) return;
    setFormError(null);
    try {
      await completeMutation.mutateAsync({
        taskId: activeTask.id,
        data: { notesRu: notes.trim() || undefined, resolution },
      });
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось закрыть задачу.');
    }
  };

  const handleDismiss = async () => {
    // The backend requires a reason; guard here so no empty mutation is fired.
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

  const handleCreate = async () => {
    if (newTitle.trim().length < 3 || newDescription.trim().length < 3) {
      setFormError('Заголовок и описание должны содержать минимум 3 символа.');
      return;
    }
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        rightsIntakeId: intakeId,
        rightsProfileId: profileId ?? undefined,
        titleRu: newTitle.trim(),
        descriptionRu: newDescription.trim(),
        dueAt: newDueAt ? new Date(newDueAt).toISOString() : undefined,
        severity: newSeverity,
      });
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось создать задачу.');
    }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Recheck &amp; Schedule</h2>
      <p className={styles.sectionHint}>
        Проверка прав — живой процесс: у профиля есть плановая дата перепроверки, а изменения
        контента, языков и законодательства автоматически открывают задачи перепроверки.
      </p>

      {profileId ? (
        <div className={styles.schedule}>
          <div className={styles.scheduleGrid}>
            <div className={styles.scheduleItem}>
              <span className={styles.scheduleLabel}>Политика</span>
              <span className={styles.scheduleValue}>{schedule?.recheckPolicy ?? '—'}</span>
            </div>
            <div className={styles.scheduleItem}>
              <span className={styles.scheduleLabel}>Плановая дата</span>
              <span className={styles.scheduleValue}>
                {formatDate(schedule?.nextReviewAt ?? null)}
              </span>
            </div>
            <div className={styles.scheduleItem}>
              <span className={styles.scheduleLabel}>Расчётный срок</span>
              <span className={styles.scheduleValue}>
                {formatDate(schedule?.computedDueAt ?? null)}
              </span>
            </div>
            <div className={styles.scheduleItem}>
              <span className={styles.scheduleLabel}>Интервал, дней</span>
              <span className={styles.scheduleValue}>{schedule?.recheckIntervalDays ?? '—'}</span>
            </div>
            <div className={styles.scheduleItem}>
              <span className={styles.scheduleLabel}>Пауза до</span>
              <span className={styles.scheduleValue}>
                {formatDate(schedule?.recheckPausedUntil ?? null)}
              </span>
            </div>
            <div className={styles.scheduleItem}>
              <span className={styles.scheduleLabel}>Последний скан</span>
              <span className={styles.scheduleValue}>
                {formatDateTime(schedule?.lastRecheckScanAt ?? null)}
              </span>
            </div>
          </div>

          {isEditingSchedule ? (
            <>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="recheck-policy">
                    Политика перепроверки
                  </label>
                  <select
                    id="recheck-policy"
                    className={styles.select}
                    value={policy}
                    onChange={(event) => setPolicy(event.target.value as RightsRecheckPolicy)}
                  >
                    {POLICY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="recheck-next-review">
                    Плановая дата
                  </label>
                  <input
                    id="recheck-next-review"
                    className={styles.textInput}
                    type="date"
                    value={nextReviewAt}
                    onChange={(event) => setNextReviewAt(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="recheck-interval">
                    Интервал, дней
                  </label>
                  <input
                    id="recheck-interval"
                    className={styles.numberInput}
                    type="number"
                    min={7}
                    max={3650}
                    value={intervalDays}
                    onChange={(event) => setIntervalDays(event.target.value)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="recheck-paused-until">
                    Пауза до
                  </label>
                  <input
                    id="recheck-paused-until"
                    className={styles.textInput}
                    type="date"
                    value={pausedUntil}
                    onChange={(event) => setPausedUntil(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="recheck-pause-reason">
                    Причина паузы
                  </label>
                  <input
                    id="recheck-pause-reason"
                    className={styles.textInput}
                    type="text"
                    value={pauseReason}
                    onChange={(event) => setPauseReason(event.target.value)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <button
                  className={styles.actionBtnPrimary}
                  onClick={handleSaveSchedule}
                  disabled={updateScheduleMutation.isPending}
                >
                  Сохранить
                </button>
                <button
                  className={styles.actionBtnSecondary}
                  onClick={() => setIsEditingSchedule(false)}
                >
                  Отмена
                </button>
              </div>
            </>
          ) : (
            <button className={styles.actionBtnSecondary} onClick={openScheduleEditor}>
              <CalendarClock size={14} />
              Edit schedule
            </button>
          )}
        </div>
      ) : (
        <p className={styles.emptyState}>
          Профиль прав ещё не создан ({workflowStatus}) — расписание перепроверок появится после
          материализации проверки.
        </p>
      )}

      <h3 className={styles.subTitle}>Открытые задачи</h3>
      {openTasks.length === 0 ? (
        <p className={styles.emptyState}>Открытых задач перепроверки нет.</p>
      ) : (
        openTasks.map((task) => (
          <div key={task.id} className={styles.taskCard}>
            <div className={styles.taskHeader}>
              <span className={styles.badge} data-severity={task.effectiveSeverity}>
                {task.effectiveSeverity}
              </span>
              <span className={styles.badge}>{task.reasonRu}</span>
              <h4 className={styles.taskTitle}>{task.titleRu}</h4>
            </div>
            <p className={styles.taskDescription}>{task.descriptionRu}</p>
            <p className={styles.taskMeta}>
              Срок: {formatDate(task.dueAt)} ·{' '}
              <span className={task.isOverdue ? styles.overdue : undefined}>{dueLabel(task)}</span>
              {task.isSnoozed ? ` · отложено до ${formatDate(task.snoozedUntil)}` : ''} · статус{' '}
              {task.status}
            </p>
            <div className={styles.taskActions}>
              {task.status === 'PENDING' && (
                <button
                  className={styles.actionBtnSecondary}
                  onClick={() => void startMutation.mutateAsync(task.id)}
                  disabled={startMutation.isPending}
                >
                  Start
                </button>
              )}
              <button
                className={styles.actionBtnPrimary}
                onClick={() => {
                  setActiveTask(task);
                  setResolution('MANUALLY_CLOSED');
                  setModal('complete');
                }}
              >
                Complete
              </button>
              <button
                className={styles.actionBtnSecondary}
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
          </div>
        ))
      )}

      <div className={styles.row}>
        <button
          className={styles.actionBtnSecondary}
          onClick={() => {
            setModal('create');
            setFormError(null);
          }}
        >
          <PlusCircle size={14} />
          Request recheck
        </button>
      </div>

      {closedTasks.length > 0 && (
        <>
          <h3 className={styles.subTitle}>Закрытые задачи</h3>
          <ul className={styles.closedList}>
            {closedTasks.map((task) => (
              <li key={task.id} className={styles.closedItem}>
                <span className={styles.badge} data-status={task.status}>
                  {task.status}
                </span>
                <span>{task.titleRu}</span>
                <span>· {task.resolutionRu ?? '—'}</span>
                <span>· {formatDate(task.completedAt ?? task.dismissedAt)}</span>
                <button
                  className={styles.actionBtnSecondary}
                  onClick={() => void reopenMutation.mutateAsync(task.id)}
                  disabled={reopenMutation.isPending}
                >
                  Reopen
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {modal === 'complete' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Закрыть задачу перепроверки</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="recheck-complete-resolution">
                Резолюция
              </label>
              <select
                id="recheck-complete-resolution"
                className={styles.select}
                value={resolution}
                onChange={(event) => setResolution(event.target.value as RightsRecheckResolution)}
              >
                {RESOLUTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="recheck-complete-notes">
                Заметка
              </label>
              <textarea
                id="recheck-complete-notes"
                className={styles.textArea}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.actionBtnSecondary} onClick={closeModal}>
                Отмена
              </button>
              <button
                className={styles.actionBtnPrimary}
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
              <label className={styles.fieldLabel} htmlFor="recheck-dismiss-reason">
                Причина (обязательно)
              </label>
              <textarea
                id="recheck-dismiss-reason"
                className={styles.textArea}
                value={dismissReason}
                onChange={(event) => setDismissReason(event.target.value)}
              />
            </div>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.actionBtnSecondary} onClick={closeModal}>
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
              <label className={styles.fieldLabel} htmlFor="recheck-snooze-until">
                Отложить до
              </label>
              <input
                id="recheck-snooze-until"
                className={styles.textInput}
                type="date"
                value={snoozeUntil}
                onChange={(event) => setSnoozeUntil(event.target.value)}
              />
            </div>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.actionBtnSecondary} onClick={closeModal}>
                Отмена
              </button>
              <button
                className={styles.actionBtnPrimary}
                onClick={handleSnooze}
                disabled={snoozeMutation.isPending}
              >
                Отложить
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'create' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Запросить перепроверку</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="recheck-create-title">
                Заголовок
              </label>
              <input
                id="recheck-create-title"
                className={styles.textInput}
                type="text"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="recheck-create-description">
                Описание
              </label>
              <textarea
                id="recheck-create-description"
                className={styles.textArea}
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="recheck-create-due">
                  Срок
                </label>
                <input
                  id="recheck-create-due"
                  className={styles.textInput}
                  type="date"
                  value={newDueAt}
                  onChange={(event) => setNewDueAt(event.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="recheck-create-severity">
                  Критичность
                </label>
                <select
                  id="recheck-create-severity"
                  className={styles.select}
                  value={newSeverity}
                  onChange={(event) => setNewSeverity(event.target.value as RightsRecheckSeverity)}
                >
                  {SEVERITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.actionBtnSecondary} onClick={closeModal}>
                Отмена
              </button>
              <button
                className={styles.actionBtnPrimary}
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                Создать задачу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
