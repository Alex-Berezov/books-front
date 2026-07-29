'use client';

import { useEffect, useMemo, useState, type FC } from 'react';
import {
  useAddLawyerReviewNote,
  useAssignLawyerReview,
  useAttachLegalOpinion,
  useDecideLawyerReview,
  useLawyerReview,
  useLawyers,
  useReopenLawyerReview,
  useSatisfyLawyerCondition,
  useStartLawyerReview,
  useWaiveLawyerCondition,
  useWithdrawLawyerReview,
} from '@/api/hooks/useRightsLawyer';
import type {
  LawyerConditionInput,
  RightsLawyerDecision,
  RightsLegalOpinionKind,
} from '@/types/api-schema/rights-lawyer';
import {
  LAWYER_CONDITION_STATUS_COLORS,
  LAWYER_CONDITION_STATUS_LABELS,
  LAWYER_DECISION_LABELS,
  LAWYER_EVENT_TYPE_LABELS,
  LAWYER_REVIEW_STATUS_COLORS,
  LAWYER_REVIEW_STATUS_LABELS,
  LAWYER_REVIEW_TRIGGER_LABELS,
  LEGAL_OPINION_KIND_LABELS,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_LABELS,
} from '../lawyerLabels';
import styles from './LawyerReviewDrawer.module.scss';

export interface LawyerReviewDrawerProps {
  reviewId: string | null;
  onClose: () => void;
  /** Роль `admin` или `content_manager`: отзыв проверки и закрытие условий. */
  isStaff: boolean;
  /** Роль `admin`: переоткрытие проверки и отмена условий. */
  isAdmin: boolean;
  /** Роль `admin` или `lawyer`: назначение, взятие в работу, решение, заключения. */
  canDecide: boolean;
}

type FormKind = 'decide' | 'opinion' | 'note' | 'withdraw' | null;

const OPINION_KINDS: RightsLegalOpinionKind[] = [
  'EXTERNAL_COUNSEL_MEMO',
  'IN_HOUSE_MEMO',
  'EMAIL_CONFIRMATION',
  'COURT_FILING',
  'REGULATOR_RESPONSE',
  'OTHER',
];

const DECISIONS: RightsLawyerDecision[] = ['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED'];

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString() : '—';

const formatDateTime = (value: string | null): string =>
  value ? new Date(value).toLocaleString() : '—';

const splitCodes = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

/**
 * Shared detail drawer for one legal review. Used from the intake page, the global inbox and the
 * book rights tab, so all role gating arrives through props rather than being read here.
 */
export const LawyerReviewDrawer: FC<LawyerReviewDrawerProps> = ({
  reviewId,
  onClose,
  isStaff,
  isAdmin,
  canDecide,
}) => {
  const [form, setForm] = useState<FormKind>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [assignLawyerId, setAssignLawyerId] = useState('');
  const [decision, setDecision] = useState<RightsLawyerDecision>('APPROVED');
  const [decisionLawyerId, setDecisionLawyerId] = useState('');
  const [opinionSummary, setOpinionSummary] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [approvedCountries, setApprovedCountries] = useState('');
  const [blockedCountries, setBlockedCountries] = useState('');
  const [conditions, setConditions] = useState<LawyerConditionInput[]>([]);
  const [conditionCode, setConditionCode] = useState('');
  const [conditionText, setConditionText] = useState('');

  const [opinionKind, setOpinionKind] = useState<RightsLegalOpinionKind>('EXTERNAL_COUNSEL_MEMO');
  const [opinionTitle, setOpinionTitle] = useState('');
  const [opinionBody, setOpinionBody] = useState('');
  const [opinionUrl, setOpinionUrl] = useState('');
  const [opinionSha, setOpinionSha] = useState('');
  const [opinionIssuedAt, setOpinionIssuedAt] = useState('');
  const [opinionJurisdictions, setOpinionJurisdictions] = useState('');
  const [opinionCreated, setOpinionCreated] = useState(false);

  const [note, setNote] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');

  const reviewQuery = useLawyerReview(reviewId ?? '');
  const lawyersQuery = useLawyers({ isActive: true, limit: 100 });

  const assignMutation = useAssignLawyerReview();
  const startMutation = useStartLawyerReview();
  const decideMutation = useDecideLawyerReview();
  const withdrawMutation = useWithdrawLawyerReview();
  const reopenMutation = useReopenLawyerReview();
  const noteMutation = useAddLawyerReviewNote();
  const opinionMutation = useAttachLegalOpinion();
  const satisfyMutation = useSatisfyLawyerCondition();
  const waiveMutation = useWaiveLawyerCondition();

  const review = reviewQuery.data ?? null;
  const activeLawyers = useMemo(() => lawyersQuery.data?.items ?? [], [lawyersQuery.data]);

  useEffect(() => {
    if (review?.assignedLawyerId) {
      setAssignLawyerId(review.assignedLawyerId);
      setDecisionLawyerId((current) => current || review.assignedLawyerId || '');
    }
  }, [review?.assignedLawyerId]);

  if (!reviewId) return null;

  const closeForm = () => {
    setForm(null);
    setFormError(null);
  };

  const isOpen = review ? review.status === 'PENDING' || review.status === 'IN_PROGRESS' : false;
  const isClosed = review ? ['REJECTED', 'WITHDRAWN', 'EXPIRED'].includes(review.status) : false;

  const decisionValid =
    decisionLawyerId.length > 0 &&
    opinionSummary.trim().length >= 10 &&
    (decision !== 'APPROVED_WITH_CONDITIONS' || conditions.length > 0);

  const handleAssign = async () => {
    if (!assignLawyerId) {
      setFormError('Выберите юриста.');
      return;
    }
    setFormError(null);
    try {
      await assignMutation.mutateAsync({ id: reviewId, data: { lawyerId: assignLawyerId } });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось назначить юриста.');
    }
  };

  const handleStart = async () => {
    setFormError(null);
    try {
      await startMutation.mutateAsync(reviewId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось взять проверку в работу.');
    }
  };

  const handleAddCondition = () => {
    if (conditionCode.trim().length < 2 || conditionText.trim().length < 3) {
      setFormError('Код условия и текст обязательны.');
      return;
    }
    setConditions((current) => [
      ...current,
      { code: conditionCode.trim().toUpperCase(), textRu: conditionText.trim(), isBlocking: true },
    ]);
    setConditionCode('');
    setConditionText('');
    setFormError(null);
  };

  const handleDecide = async () => {
    if (!decisionValid) {
      setFormError(
        'Нужны юрист, заключение не короче 10 символов и хотя бы одно условие для решения с условиями.'
      );
      return;
    }
    setFormError(null);
    try {
      await decideMutation.mutateAsync({
        id: reviewId,
        data: {
          decision,
          lawyerId: decisionLawyerId,
          opinionSummaryRu: opinionSummary.trim(),
          restrictionsRu: restrictions.trim() || undefined,
          approvedCountryCodes: approvedCountries ? splitCodes(approvedCountries) : undefined,
          blockedCountryCodes: blockedCountries ? splitCodes(blockedCountries) : undefined,
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
          conditions: decision === 'APPROVED_WITH_CONDITIONS' ? conditions : undefined,
        },
      });
      setConditions([]);
      setOpinionSummary('');
      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось сохранить решение.');
    }
  };

  const handleAttachOpinion = async () => {
    if (opinionTitle.trim().length < 3 || opinionBody.trim().length < 10) {
      setFormError('Заголовок (от 3 символов) и текст заключения (от 10 символов) обязательны.');
      return;
    }
    setFormError(null);
    try {
      await opinionMutation.mutateAsync({
        reviewId,
        data: {
          kind: opinionKind,
          titleRu: opinionTitle.trim(),
          bodyRu: opinionBody.trim(),
          lawyerId: decisionLawyerId || undefined,
          documentUrl: opinionUrl.trim() || undefined,
          documentSha256: opinionSha.trim() || undefined,
          issuedAt: opinionIssuedAt ? new Date(opinionIssuedAt).toISOString() : undefined,
          jurisdictionCodes: opinionJurisdictions ? splitCodes(opinionJurisdictions) : undefined,
        },
      });
      setOpinionTitle('');
      setOpinionBody('');
      setOpinionCreated(true);
      setForm(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось прикрепить заключение.');
    }
  };

  const handleNote = async () => {
    if (note.trim().length === 0) {
      setFormError('Комментарий не может быть пустым.');
      return;
    }
    setFormError(null);
    try {
      await noteMutation.mutateAsync({ id: reviewId, data: { messageRu: note.trim() } });
      setNote('');
      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось добавить комментарий.');
    }
  };

  const handleWithdraw = async () => {
    if (withdrawReason.trim().length < 10) {
      setFormError('Причина отзыва должна содержать минимум 10 символов.');
      return;
    }
    setFormError(null);
    try {
      await withdrawMutation.mutateAsync({
        id: reviewId,
        data: { reasonRu: withdrawReason.trim() },
      });
      setWithdrawReason('');
      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось отозвать проверку.');
    }
  };

  const handleReopen = async () => {
    setFormError(null);
    try {
      await reopenMutation.mutateAsync(reviewId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось переоткрыть проверку.');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.drawer} role="dialog" aria-label="Юридическая проверка">
        {reviewQuery.isLoading && <p className={styles.emptyState}>Загрузка…</p>}
        {reviewQuery.isError && (
          <p className={styles.errorText}>Не удалось загрузить юридическую проверку.</p>
        )}

        {review && (
          <>
            <div className={styles.header}>
              <div>
                <h2 className={styles.title}>{review.reviewNumber}</h2>
                <p className={styles.subTitle}>{review.titleRu}</p>
                <div className={styles.badges}>
                  <span
                    className={styles.badge}
                    data-tone={LAWYER_REVIEW_STATUS_COLORS[review.effectiveStatus]}
                  >
                    {LAWYER_REVIEW_STATUS_LABELS[review.effectiveStatus]}
                  </span>
                  <span className={styles.badge} data-tone={RISK_LEVEL_COLORS[review.riskLevel]}>
                    {RISK_LEVEL_LABELS[review.riskLevel]}
                  </span>
                  <span className={styles.badge}>
                    {LAWYER_REVIEW_TRIGGER_LABELS[review.trigger]}
                  </span>
                  {review.blocksApproval && (
                    <span className={styles.badge} data-tone="red">
                      Блокирует утверждение
                    </span>
                  )}
                  {review.isOverdue && (
                    <span className={styles.badge} data-tone="orange">
                      Просрочена
                    </span>
                  )}
                </div>
              </div>
              <button type="button" className={styles.button} onClick={onClose}>
                Закрыть
              </button>
            </div>

            <div className={styles.grid}>
              <div className={styles.item}>
                <span className={styles.label}>Юрист (актуальное имя)</span>
                <span className={styles.value}>{review.assignedLawyerName ?? '—'}</span>
              </div>
              <div className={styles.item}>
                <span className={styles.label}>Имя юриста в решении</span>
                <span className={styles.value}>{review.lawyerNameSnapshot ?? '—'}</span>
              </div>
              <div className={styles.item}>
                <span className={styles.label}>Срок проверки</span>
                <span className={styles.value}>{formatDate(review.dueAt)}</span>
              </div>
              <div className={styles.item}>
                <span className={styles.label}>Заключение действует до</span>
                <span className={styles.value}>
                  {review.validUntil ? formatDate(review.validUntil) : 'бессрочно'}
                </span>
              </div>
              <div className={styles.item}>
                <span className={styles.label}>Интейк</span>
                <span className={styles.value}>{review.intakeTitle ?? '—'}</span>
              </div>
              <div className={styles.item}>
                <span className={styles.label}>Книга / версия</span>
                <span className={styles.value}>
                  {review.bookSlug ?? '—'}
                  {review.versionLanguage ? ` (${review.versionLanguage})` : ''}
                </span>
              </div>
            </div>

            <h3 className={styles.sectionTitle}>Вопрос и контекст</h3>
            <p className={styles.text}>{review.questionRu}</p>
            {review.contextRu && <p className={styles.text}>{review.contextRu}</p>}

            {review.riskFactors.length > 0 && (
              <>
                <h3 className={styles.sectionTitle}>Факторы риска</h3>
                <ul className={styles.list}>
                  {review.riskFactors.map((factor) => (
                    <li key={factor.code} className={styles.listItem}>
                      <span>{factor.messageRu}</span>
                      <span className={styles.badge} data-tone={RISK_LEVEL_COLORS[factor.level]}>
                        {factor.code}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {review.decision && (
              <>
                <h3 className={styles.sectionTitle}>Решение</h3>
                <div className={styles.grid}>
                  <div className={styles.item}>
                    <span className={styles.label}>Вердикт</span>
                    <span className={styles.value}>{LAWYER_DECISION_LABELS[review.decision]}</span>
                  </div>
                  <div className={styles.item}>
                    <span className={styles.label}>Дата решения</span>
                    <span className={styles.value}>{formatDateTime(review.decidedAt)}</span>
                  </div>
                </div>
                {review.opinionSummaryRu && (
                  <p className={styles.text}>{review.opinionSummaryRu}</p>
                )}
                {review.restrictionsRu && <p className={styles.text}>{review.restrictionsRu}</p>}
              </>
            )}

            <h3 className={styles.sectionTitle}>Условия ({review.conditions.length})</h3>
            {review.conditions.length === 0 ? (
              <p className={styles.emptyState}>Условий нет.</p>
            ) : (
              <ul className={styles.list}>
                {review.conditions.map((condition) => (
                  <li key={condition.id} className={styles.listItem}>
                    <span>
                      <strong>{condition.code}</strong> — {condition.textRu}
                      {condition.isBlocking ? ' (блокирующее)' : ''}
                    </span>
                    <span className={styles.actions}>
                      <span
                        className={styles.badge}
                        data-tone={LAWYER_CONDITION_STATUS_COLORS[condition.status]}
                      >
                        {LAWYER_CONDITION_STATUS_LABELS[condition.status]}
                      </span>
                      {condition.status === 'PENDING' && isStaff && (
                        <button
                          type="button"
                          className={styles.button}
                          onClick={() =>
                            void satisfyMutation.mutateAsync({
                              reviewId,
                              conditionId: condition.id,
                              data: {},
                            })
                          }
                        >
                          Выполнено
                        </button>
                      )}
                      {condition.status === 'PENDING' && isAdmin && (
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() =>
                            void waiveMutation.mutateAsync({
                              reviewId,
                              conditionId: condition.id,
                              data: { reasonRu: 'Отменено администратором вручную.' },
                            })
                          }
                        >
                          Отменить
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <h3 className={styles.sectionTitle}>Заключения ({review.opinions.length})</h3>
            {review.opinions.length === 0 ? (
              <p className={styles.emptyState}>Заключения не прикреплены.</p>
            ) : (
              <ul className={styles.list}>
                {review.opinions.map((opinion) => (
                  <li key={opinion.id} className={styles.listItem}>
                    <span>
                      <strong>{opinion.titleRu}</strong> — {LEGAL_OPINION_KIND_LABELS[opinion.kind]}
                      {opinion.lawyerNameSnapshot ? `, ${opinion.lawyerNameSnapshot}` : ''}
                      {opinion.archivedAt ? ' (архивировано)' : ''}
                    </span>
                    {opinion.rightsEvidenceId && (
                      <span className={styles.badge} data-tone="green">
                        LEGAL_OPINION
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {opinionCreated && (
              <p className={styles.hint}>
                Заключение прикреплено. Для профиля прав автоматически создано доказательство типа
                LEGAL_OPINION.
              </p>
            )}

            <h3 className={styles.sectionTitle}>Таймлайн</h3>
            <ul className={styles.list}>
              {review.events.map((event) => (
                <li key={event.id} className={styles.timelineItem}>
                  <span className={styles.timelineType}>
                    {LAWYER_EVENT_TYPE_LABELS[event.eventType]}
                  </span>
                  {event.messageRu} · {formatDateTime(event.createdAt)}
                </li>
              ))}
            </ul>

            <h3 className={styles.sectionTitle}>Действия</h3>
            <div className={styles.actions}>
              {isOpen && canDecide && (
                <>
                  <select
                    className={styles.select}
                    aria-label="Юрист для назначения"
                    value={assignLawyerId}
                    onChange={(event) => setAssignLawyerId(event.target.value)}
                  >
                    <option value="">— выберите юриста —</option>
                    {activeLawyers.map((lawyer) => (
                      <option key={lawyer.id} value={lawyer.id}>
                        {lawyer.fullName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => void handleAssign()}
                  >
                    Назначить
                  </button>
                </>
              )}
              {review.status === 'PENDING' && canDecide && (
                <button type="button" className={styles.button} onClick={() => void handleStart()}>
                  Взять в работу
                </button>
              )}
              {isOpen && canDecide && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setForm('decide')}
                >
                  Вынести решение
                </button>
              )}
              {canDecide && (
                <button type="button" className={styles.button} onClick={() => setForm('opinion')}>
                  Прикрепить заключение
                </button>
              )}
              <button type="button" className={styles.button} onClick={() => setForm('note')}>
                Комментарий
              </button>
              {isOpen && isStaff && (
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => setForm('withdraw')}
                >
                  Отозвать
                </button>
              )}
              {isClosed && isAdmin && (
                <button type="button" className={styles.button} onClick={() => void handleReopen()}>
                  Переоткрыть
                </button>
              )}
            </div>

            {form === 'decide' && (
              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="lawyer-decision">
                    Решение
                  </label>
                  <select
                    id="lawyer-decision"
                    className={styles.select}
                    value={decision}
                    onChange={(event) => setDecision(event.target.value as RightsLawyerDecision)}
                  >
                    {DECISIONS.map((value) => (
                      <option key={value} value={value}>
                        {LAWYER_DECISION_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="lawyer-decision-lawyer">
                    Юрист (обязательно)
                  </label>
                  <select
                    id="lawyer-decision-lawyer"
                    className={styles.select}
                    value={decisionLawyerId}
                    onChange={(event) => setDecisionLawyerId(event.target.value)}
                  >
                    <option value="">— выберите юриста —</option>
                    {activeLawyers.map((lawyer) => (
                      <option key={lawyer.id} value={lawyer.id}>
                        {lawyer.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="lawyer-opinion-summary">
                    Заключение (минимум 10 символов)
                  </label>
                  <textarea
                    id="lawyer-opinion-summary"
                    className={styles.textArea}
                    value={opinionSummary}
                    onChange={(event) => setOpinionSummary(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="lawyer-restrictions">
                    Ограничения
                  </label>
                  <textarea
                    id="lawyer-restrictions"
                    className={styles.textArea}
                    value={restrictions}
                    onChange={(event) => setRestrictions(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="lawyer-valid-until">
                    Действует до
                  </label>
                  <input
                    id="lawyer-valid-until"
                    className={styles.textInput}
                    type="date"
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="lawyer-approved-countries">
                    Разрешённые страны (через запятую)
                  </label>
                  <input
                    id="lawyer-approved-countries"
                    className={styles.textInput}
                    value={approvedCountries}
                    onChange={(event) => setApprovedCountries(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="lawyer-blocked-countries">
                    Запрещённые страны (через запятую)
                  </label>
                  <input
                    id="lawyer-blocked-countries"
                    className={styles.textInput}
                    value={blockedCountries}
                    onChange={(event) => setBlockedCountries(event.target.value)}
                  />
                </div>

                {decision === 'APPROVED_WITH_CONDITIONS' && (
                  <>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel} htmlFor="lawyer-condition-code">
                        Код условия
                      </label>
                      <input
                        id="lawyer-condition-code"
                        className={styles.textInput}
                        value={conditionCode}
                        onChange={(event) => setConditionCode(event.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel} htmlFor="lawyer-condition-text">
                        Текст условия
                      </label>
                      <input
                        id="lawyer-condition-text"
                        className={styles.textInput}
                        value={conditionText}
                        onChange={(event) => setConditionText(event.target.value)}
                      />
                    </div>
                    <button type="button" className={styles.button} onClick={handleAddCondition}>
                      Добавить условие
                    </button>
                    <ul className={styles.list}>
                      {conditions.map((condition) => (
                        <li key={condition.code} className={styles.listItem}>
                          <span>
                            <strong>{condition.code}</strong> — {condition.textRu}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={!decisionValid || decideMutation.isPending}
                    onClick={() => void handleDecide()}
                  >
                    Сохранить решение
                  </button>
                  <button type="button" className={styles.button} onClick={closeForm}>
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {form === 'opinion' && (
              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="opinion-kind">
                    Тип заключения
                  </label>
                  <select
                    id="opinion-kind"
                    className={styles.select}
                    value={opinionKind}
                    onChange={(event) =>
                      setOpinionKind(event.target.value as RightsLegalOpinionKind)
                    }
                  >
                    {OPINION_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {LEGAL_OPINION_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="opinion-title">
                    Заголовок
                  </label>
                  <input
                    id="opinion-title"
                    className={styles.textInput}
                    value={opinionTitle}
                    onChange={(event) => setOpinionTitle(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="opinion-body">
                    Текст заключения
                  </label>
                  <textarea
                    id="opinion-body"
                    className={styles.textArea}
                    value={opinionBody}
                    onChange={(event) => setOpinionBody(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="opinion-url">
                    Ссылка на документ
                  </label>
                  <input
                    id="opinion-url"
                    className={styles.textInput}
                    value={opinionUrl}
                    onChange={(event) => setOpinionUrl(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="opinion-sha">
                    sha256 документа
                  </label>
                  <input
                    id="opinion-sha"
                    className={styles.textInput}
                    value={opinionSha}
                    onChange={(event) => setOpinionSha(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="opinion-issued">
                    Дата выдачи
                  </label>
                  <input
                    id="opinion-issued"
                    className={styles.textInput}
                    type="date"
                    value={opinionIssuedAt}
                    onChange={(event) => setOpinionIssuedAt(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="opinion-jurisdictions">
                    Юрисдикции (через запятую)
                  </label>
                  <input
                    id="opinion-jurisdictions"
                    className={styles.textInput}
                    value={opinionJurisdictions}
                    onChange={(event) => setOpinionJurisdictions(event.target.value)}
                  />
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={opinionMutation.isPending}
                    onClick={() => void handleAttachOpinion()}
                  >
                    Прикрепить
                  </button>
                  <button type="button" className={styles.button} onClick={closeForm}>
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {form === 'note' && (
              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="lawyer-note">
                    Комментарий
                  </label>
                  <textarea
                    id="lawyer-note"
                    className={styles.textArea}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => void handleNote()}
                  >
                    Добавить
                  </button>
                  <button type="button" className={styles.button} onClick={closeForm}>
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {form === 'withdraw' && (
              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="lawyer-withdraw">
                    Причина отзыва (минимум 10 символов)
                  </label>
                  <textarea
                    id="lawyer-withdraw"
                    className={styles.textArea}
                    value={withdrawReason}
                    onChange={(event) => setWithdrawReason(event.target.value)}
                  />
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => void handleWithdraw()}
                  >
                    Отозвать проверку
                  </button>
                  <button type="button" className={styles.button} onClick={closeForm}>
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {formError && <p className={styles.errorText}>{formError}</p>}
          </>
        )}
      </div>
    </div>
  );
};
