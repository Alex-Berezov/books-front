'use client';

import { useState, type FC } from 'react';
import { PlayCircle, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  useApplyRightsLegalChange,
  useArchiveRightsLegalChange,
  useCompleteRightsRecheckTask,
  useCreateRightsLegalChange,
  useDismissRightsRecheckTask,
  useRecheckScanRuns,
  useRightsLegalChanges,
  useRightsRecheckTasks,
  useRunRecheckScan,
  useSnoozeRightsRecheckTask,
  useStartRightsRecheckTask,
} from '@/api/hooks/useRightsRecheck';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  RightsLegalChange,
  RightsLegalChangeType,
  RightsRecheckReason,
  RightsRecheckSeverity,
  RightsRecheckStatus,
  RightsRecheckTask,
} from '@/types/api-schema/rights-recheck';
import styles from './RightsRechecksView.module.scss';

export interface RightsRechecksViewProps {
  lang: SupportedLang;
}

type TabKey = 'tasks' | 'legal-changes';
type ModalKind = 'complete' | 'dismiss' | 'snooze' | 'create-legal' | 'apply-legal' | null;

const PAGE_SIZE = 20;

const STATUS_OPTIONS: RightsRecheckStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED'];

const REASON_OPTIONS: RightsRecheckReason[] = [
  'SCHEDULED_DUE',
  'CONTENT_CHANGED',
  'RIGHTS_DATA_CHANGED',
  'LANGUAGE_ADDED',
  'AUDIO_ADDED',
  'COMPONENT_ADDED',
  'LEGAL_CHANGE',
  'REVIEW_STALE',
  'MANUAL_REQUEST',
  'OTHER',
];

const SEVERITY_OPTIONS: RightsRecheckSeverity[] = ['INFO', 'WARNING', 'BLOCKING'];

const CHANGE_TYPE_OPTIONS: RightsLegalChangeType[] = [
  'COPYRIGHT_TERM_CHANGE',
  'PUBLIC_DOMAIN_RULE_CHANGE',
  'TRANSLATION_RIGHTS_CHANGE',
  'NEIGHBOURING_RIGHTS_CHANGE',
  'COURT_DECISION',
  'TREATY_RATIFICATION',
  'PLATFORM_POLICY_CHANGE',
  'OTHER',
];

const APPLY_WARNING =
  'Будут открыты задачи перепроверки для всех профилей в выбранных юрисдикциях. Действие необратимо.';

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString() : '—';

const formatDateTime = (value: string | null): string =>
  value ? new Date(value).toLocaleString() : '—';

export const RightsRechecksView: FC<RightsRechecksViewProps> = ({ lang }) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.roles?.includes('admin') || false;

  const [tab, setTab] = useState<TabKey>('tasks');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RightsRecheckStatus | ''>('');
  const [reasonFilter, setReasonFilter] = useState<RightsRecheckReason | ''>('');
  const [severityFilter, setSeverityFilter] = useState<RightsRecheckSeverity | ''>('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [legalPage, setLegalPage] = useState(1);

  const [modal, setModal] = useState<ModalKind>(null);
  const [activeTask, setActiveTask] = useState<RightsRecheckTask | null>(null);
  const [activeLegalChange, setActiveLegalChange] = useState<RightsLegalChange | null>(null);
  const [notes, setNotes] = useState('');
  const [dismissReason, setDismissReason] = useState('');
  const [snoozeUntil, setSnoozeUntil] = useState('');
  const [legalTitle, setLegalTitle] = useState('');
  const [legalDescription, setLegalDescription] = useState('');
  const [legalType, setLegalType] = useState<RightsLegalChangeType>('COPYRIGHT_TERM_CHANGE');
  const [legalSeverity, setLegalSeverity] = useState<RightsRecheckSeverity>('WARNING');
  const [legalJurisdictions, setLegalJurisdictions] = useState('');
  const [legalAllCountries, setLegalAllCountries] = useState(false);
  const [legalEffectiveFrom, setLegalEffectiveFrom] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const tasksQuery = useRightsRecheckTasks({
    page,
    limit: PAGE_SIZE,
    status: statusFilter || undefined,
    reason: reasonFilter || undefined,
    severity: severityFilter || undefined,
    overdueOnly: overdueOnly || undefined,
  });
  const scanRunsQuery = useRecheckScanRuns({ limit: 1 });
  const legalChangesQuery = useRightsLegalChanges({ page: legalPage, limit: PAGE_SIZE });

  const startMutation = useStartRightsRecheckTask();
  const completeMutation = useCompleteRightsRecheckTask();
  const dismissMutation = useDismissRightsRecheckTask();
  const snoozeMutation = useSnoozeRightsRecheckTask();
  const runScanMutation = useRunRecheckScan();
  const createLegalMutation = useCreateRightsLegalChange();
  const applyLegalMutation = useApplyRightsLegalChange();
  const archiveLegalMutation = useArchiveRightsLegalChange();

  const tasks = tasksQuery.data?.items ?? [];
  const total = tasksQuery.data?.total ?? 0;
  const lastScan = scanRunsQuery.data?.items[0] ?? null;
  const legalChanges = legalChangesQuery.data?.items ?? [];
  const legalTotal = legalChangesQuery.data?.total ?? 0;

  const closeModal = () => {
    setModal(null);
    setActiveTask(null);
    setActiveLegalChange(null);
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

  const handleCreateLegalChange = async () => {
    const codes = legalJurisdictions
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean);

    if (legalTitle.trim().length < 3 || legalDescription.trim().length < 3) {
      setFormError('Заголовок и описание должны содержать минимум 3 символа.');
      return;
    }
    if (!legalAllCountries && codes.length === 0) {
      setFormError('Укажите хотя бы одну юрисдикцию (ISO-2) или отметьте «все страны».');
      return;
    }

    setFormError(null);
    try {
      await createLegalMutation.mutateAsync({
        titleRu: legalTitle.trim(),
        descriptionRu: legalDescription.trim(),
        changeType: legalType,
        severity: legalSeverity,
        jurisdictionCodes: codes,
        appliesToAllCountries: legalAllCountries,
        effectiveFrom: legalEffectiveFrom ? new Date(legalEffectiveFrom).toISOString() : undefined,
      });
      setLegalTitle('');
      setLegalDescription('');
      setLegalJurisdictions('');
      setLegalEffectiveFrom('');
      setLegalAllCountries(false);
      closeModal();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Не удалось создать изменение законодательства.'
      );
    }
  };

  const handleApplyLegalChange = async () => {
    if (!activeLegalChange) return;
    setFormError(null);
    try {
      await applyLegalMutation.mutateAsync(activeLegalChange.id);
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось применить изменение.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const legalTotalPages = Math.max(1, Math.ceil(legalTotal / PAGE_SIZE));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Rights Rechecks</h1>
      </div>

      <div className={styles.tabs}>
        <button
          className={tab === 'tasks' ? styles.tabActive : styles.tab}
          onClick={() => setTab('tasks')}
        >
          Recheck tasks
        </button>
        <button
          className={tab === 'legal-changes' ? styles.tabActive : styles.tab}
          onClick={() => setTab('legal-changes')}
        >
          Legal changes
        </button>
      </div>

      {tab === 'tasks' && (
        <>
          <div className={styles.lastScan}>
            <p className={styles.lastScanMeta}>
              {lastScan
                ? `Последний скан: ${formatDateTime(lastScan.startedAt)} · ${lastScan.status} · создано задач: ${lastScan.tasksCreated} · закрыто: ${lastScan.tasksAutoClosed} · напоминаний: ${lastScan.remindersSent}`
                : 'Сканов ещё не было.'}
            </p>
            {/* Only an admin may trigger a catalogue-wide scan. */}
            {isAdmin && (
              <button
                className={styles.actionBtnPrimary}
                onClick={() => void runScanMutation.mutateAsync()}
                disabled={runScanMutation.isPending}
              >
                <PlayCircle size={14} />
                Run scan now
              </button>
            )}
          </div>

          <div className={styles.filters}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="recheck-filter-status">
                Статус
              </label>
              <select
                id="recheck-filter-status"
                className={styles.select}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as RightsRecheckStatus | '');
                  setPage(1);
                }}
              >
                <option value="">Все</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="recheck-filter-reason">
                Причина
              </label>
              <select
                id="recheck-filter-reason"
                className={styles.select}
                value={reasonFilter}
                onChange={(event) => {
                  setReasonFilter(event.target.value as RightsRecheckReason | '');
                  setPage(1);
                }}
              >
                <option value="">Все</option>
                {REASON_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="recheck-filter-severity">
                Критичность
              </label>
              <select
                id="recheck-filter-severity"
                className={styles.select}
                value={severityFilter}
                onChange={(event) => {
                  setSeverityFilter(event.target.value as RightsRecheckSeverity | '');
                  setPage(1);
                }}
              >
                <option value="">Все</option>
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(event) => {
                  setOverdueOnly(event.target.checked);
                  setPage(1);
                }}
              />
              Только просроченные
            </label>
          </div>

          {tasks.length === 0 ? (
            <p className={styles.emptyState}>Задач перепроверки не найдено.</p>
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
                    <th>Ссылки</th>
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
                        {task.rightsIntakeId && (
                          <Link
                            className={styles.link}
                            href={`/admin/${lang}/rights-intakes/${task.rightsIntakeId}`}
                          >
                            Интейк
                          </Link>
                        )}
                        {task.bookVersionId && (
                          <>
                            {task.rightsIntakeId ? ' · ' : ''}
                            <Link
                              className={styles.link}
                              href={`/admin/${lang}/books/versions/${task.bookVersionId}`}
                            >
                              Версия
                            </Link>
                          </>
                        )}
                      </td>
                      <td>
                        {task.isOpen && (
                          <>
                            {task.status === 'PENDING' && (
                              <button
                                className={styles.actionBtnSecondary}
                                onClick={() => void startMutation.mutateAsync(task.id)}
                                disabled={startMutation.isPending}
                              >
                                Start
                              </button>
                            )}{' '}
                            <button
                              className={styles.actionBtnSecondary}
                              onClick={() => {
                                setActiveTask(task);
                                setModal('complete');
                              }}
                            >
                              Complete
                            </button>{' '}
                            <button
                              className={styles.actionBtnSecondary}
                              onClick={() => {
                                setActiveTask(task);
                                setModal('snooze');
                              }}
                            >
                              Snooze
                            </button>{' '}
                            <button
                              className={styles.actionBtnDanger}
                              onClick={() => {
                                setActiveTask(task);
                                setModal('dismiss');
                              }}
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.pagination}>
            <button
              className={styles.actionBtnSecondary}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              Назад
            </button>
            <span className={styles.paginationInfo}>
              Страница {page} из {totalPages} · всего {total}
            </span>
            <button
              className={styles.actionBtnSecondary}
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages}
            >
              Вперёд
            </button>
          </div>
        </>
      )}

      {tab === 'legal-changes' && (
        <>
          <div className={styles.filters}>
            <button
              className={styles.actionBtnPrimary}
              onClick={() => {
                setModal('create-legal');
                setFormError(null);
              }}
            >
              <PlusCircle size={14} />
              Новое изменение
            </button>
          </div>

          {legalChanges.length === 0 ? (
            <p className={styles.emptyState}>Изменений законодательства пока нет.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Статус</th>
                    <th>Заголовок</th>
                    <th>Тип</th>
                    <th>Критичность</th>
                    <th>Юрисдикции</th>
                    <th>В силе с</th>
                    <th>Профилей / задач</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {legalChanges.map((change) => (
                    <tr key={change.id}>
                      <td>
                        <span className={styles.badge} data-status={change.status}>
                          {change.status}
                        </span>
                      </td>
                      <td className={styles.titleCell}>{change.titleRu}</td>
                      <td>{change.changeType}</td>
                      <td>
                        <span className={styles.badge} data-severity={change.severity}>
                          {change.severity}
                        </span>
                      </td>
                      <td>
                        {change.appliesToAllCountries
                          ? 'Все страны'
                          : change.jurisdictionCodes.join(', ')}
                      </td>
                      <td>{formatDate(change.effectiveFrom)}</td>
                      <td>
                        {change.affectedProfilesCount} / {change.createdTasksCount}
                      </td>
                      <td>
                        {isAdmin && change.status === 'DRAFT' && (
                          <button
                            className={styles.actionBtnSecondary}
                            onClick={() => {
                              setActiveLegalChange(change);
                              setModal('apply-legal');
                            }}
                          >
                            Apply
                          </button>
                        )}{' '}
                        {isAdmin && change.status !== 'ARCHIVED' && (
                          <button
                            className={styles.actionBtnDanger}
                            onClick={() => void archiveLegalMutation.mutateAsync(change.id)}
                            disabled={archiveLegalMutation.isPending}
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.pagination}>
            <button
              className={styles.actionBtnSecondary}
              onClick={() => setLegalPage((current) => Math.max(1, current - 1))}
              disabled={legalPage <= 1}
            >
              Назад
            </button>
            <span className={styles.paginationInfo}>
              Страница {legalPage} из {legalTotalPages} · всего {legalTotal}
            </span>
            <button
              className={styles.actionBtnSecondary}
              onClick={() => setLegalPage((current) => current + 1)}
              disabled={legalPage >= legalTotalPages}
            >
              Вперёд
            </button>
          </div>
        </>
      )}

      {modal === 'complete' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Закрыть задачу перепроверки</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="rechecks-complete-notes">
                Заметка
              </label>
              <textarea
                id="rechecks-complete-notes"
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
              <label className={styles.fieldLabel} htmlFor="rechecks-dismiss-reason">
                Причина (обязательно)
              </label>
              <textarea
                id="rechecks-dismiss-reason"
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
              <label className={styles.fieldLabel} htmlFor="rechecks-snooze-until">
                Отложить до
              </label>
              <input
                id="rechecks-snooze-until"
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

      {modal === 'create-legal' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Новое изменение законодательства</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="legal-title">
                Заголовок
              </label>
              <input
                id="legal-title"
                className={styles.textInput}
                type="text"
                value={legalTitle}
                onChange={(event) => setLegalTitle(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="legal-description">
                Описание
              </label>
              <textarea
                id="legal-description"
                className={styles.textArea}
                value={legalDescription}
                onChange={(event) => setLegalDescription(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="legal-type">
                Тип изменения
              </label>
              <select
                id="legal-type"
                className={styles.select}
                value={legalType}
                onChange={(event) => setLegalType(event.target.value as RightsLegalChangeType)}
              >
                {CHANGE_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="legal-severity">
                Критичность
              </label>
              <select
                id="legal-severity"
                className={styles.select}
                value={legalSeverity}
                onChange={(event) => setLegalSeverity(event.target.value as RightsRecheckSeverity)}
              >
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="legal-jurisdictions">
                Юрисдикции (ISO-2, через запятую)
              </label>
              <input
                id="legal-jurisdictions"
                className={styles.textInput}
                type="text"
                placeholder="DE, FR"
                value={legalJurisdictions}
                onChange={(event) => setLegalJurisdictions(event.target.value)}
              />
            </div>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={legalAllCountries}
                onChange={(event) => setLegalAllCountries(event.target.checked)}
              />
              Затрагивает все страны
            </label>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="legal-effective-from">
                Вступает в силу
              </label>
              <input
                id="legal-effective-from"
                className={styles.textInput}
                type="date"
                value={legalEffectiveFrom}
                onChange={(event) => setLegalEffectiveFrom(event.target.value)}
              />
            </div>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.actionBtnSecondary} onClick={closeModal}>
                Отмена
              </button>
              <button
                className={styles.actionBtnPrimary}
                onClick={handleCreateLegalChange}
                disabled={createLegalMutation.isPending}
              >
                Создать черновик
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'apply-legal' && activeLegalChange && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Применить «{activeLegalChange.titleRu}»?</h3>
            <p className={styles.modalWarning}>{APPLY_WARNING}</p>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.actionBtnSecondary} onClick={closeModal}>
                Отмена
              </button>
              <button
                className={styles.actionBtnPrimary}
                onClick={handleApplyLegalChange}
                disabled={applyLegalMutation.isPending}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
