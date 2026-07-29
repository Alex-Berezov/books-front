'use client';

import { useMemo, useState, type FC } from 'react';
import { Scale } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  useIntakeLawyerReviews,
  useLawyers,
  useProfileRiskAssessment,
  useRequireLawyerReviewForProfile,
} from '@/api/hooks/useRightsLawyer';
import {
  LAWYER_REVIEW_STATUS_COLORS,
  LAWYER_REVIEW_STATUS_LABELS,
  LAWYER_REVIEW_TRIGGER_LABELS,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_LABELS,
} from '@/components/admin/rights-lawyer/lawyerLabels';
import { LawyerReviewDrawer } from '@/components/admin/rights-lawyer/LawyerReviewDrawer/LawyerReviewDrawer';
import styles from './LawyerReviewPanel.module.scss';

export interface LawyerReviewPanelProps {
  intakeId: string;
  profileId: string | null;
}

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString() : '—';

const formatDateTime = (value: string | null): string =>
  value ? new Date(value).toLocaleString() : '—';

/**
 * Legal review section of the intake page: the risk assessment that decides whether a lawyer is
 * required at all, the reviews opened for this intake and the opinion currently in force.
 */
export const LawyerReviewPanel: FC<LawyerReviewPanelProps> = ({ intakeId, profileId }) => {
  const { data: session } = useSession();
  const roles = session?.user?.roles ?? [];
  const isAdmin = roles.includes('admin');
  const isStaff = isAdmin || roles.includes('content_manager');
  const canDecide = isAdmin || roles.includes('lawyer');

  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assignedLawyerId, setAssignedLawyerId] = useState('');
  const [blocksApproval, setBlocksApproval] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const riskQuery = useProfileRiskAssessment(profileId ?? '', { enabled: !!profileId });
  const reviewsQuery = useIntakeLawyerReviews(intakeId, { limit: 100 });
  const lawyersQuery = useLawyers({ isActive: true, limit: 100 });
  const requireMutation = useRequireLawyerReviewForProfile();

  const assessment = riskQuery.data ?? null;
  const reviews = useMemo(() => reviewsQuery.data?.items ?? [], [reviewsQuery.data]);
  const activeLawyers = useMemo(() => lawyersQuery.data?.items ?? [], [lawyersQuery.data]);

  const currentOpinion = useMemo(
    () =>
      reviews.find(
        (review) =>
          review.effectiveStatus === 'APPROVED' ||
          review.effectiveStatus === 'APPROVED_WITH_CONDITIONS'
      ) ?? null,
    [reviews]
  );

  const closeRequest = () => {
    setIsRequestOpen(false);
    setQuestion('');
    setDueAt('');
    setAssignedLawyerId('');
    setBlocksApproval(true);
    setFormError(null);
  };

  const handleRequest = async () => {
    if (!profileId) return;
    setFormError(null);
    try {
      await requireMutation.mutateAsync({
        profileId,
        data: {
          questionRu: question.trim() || undefined,
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          blocksApproval,
          assignedLawyerId: assignedLawyerId || undefined,
        },
      });
      closeRequest();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Не удалось запросить юридическую проверку.'
      );
    }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <Scale size={16} /> Юридическая проверка
      </h2>
      <p className={styles.sectionHint}>
        Спорные книги получают отдельный контролируемый путь утверждения: система оценивает риск, а
        профиль с риском выше порога нельзя утвердить без положительного заключения юриста.
      </p>

      {!profileId && (
        <p className={styles.emptyState}>
          Оценка риска появится после материализации профиля прав.
        </p>
      )}

      {profileId && assessment && (
        <div className={styles.riskCard}>
          <div className={styles.riskHeader}>
            <span className={styles.badge} data-tone={RISK_LEVEL_COLORS[assessment.riskLevel]}>
              {RISK_LEVEL_LABELS[assessment.riskLevel]}
            </span>
            <span className={styles.badge}>Порог: {assessment.minRiskLevel}</span>
            {assessment.lawyerReviewRequired && (
              <span className={styles.badge} data-tone="orange">
                Требуется юрист
              </span>
            )}
            {assessment.lawyerApproved && (
              <span className={styles.badge} data-tone="green">
                Заключение действует
              </span>
            )}
            <span className={styles.factorCode}>
              оценено: {formatDateTime(assessment.assessedAt)}
            </span>
            <button
              type="button"
              className={styles.button}
              onClick={() => void riskQuery.refetch()}
            >
              Пересчитать
            </button>
          </div>

          {assessment.factors.length === 0 ? (
            <p className={styles.emptyState}>Факторов риска не выявлено.</p>
          ) : (
            <ul className={styles.factorList}>
              {assessment.factors.map((factor) => (
                <li key={factor.code} className={styles.factorItem}>
                  <span className={styles.badge} data-tone={RISK_LEVEL_COLORS[factor.level]}>
                    {factor.level}
                  </span>
                  <span>{factor.messageRu}</span>
                  <span className={styles.factorCode}>{factor.code}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {assessment?.lawyerReviewRequired && !assessment.lawyerApproved && (
        <div className={styles.alert}>
          Требуется юридическая проверка: утверждение этого профиля заблокировано, пока юрист не
          вынесет положительное заключение.
        </div>
      )}

      {assessment?.lawyerApproved && (
        <div className={styles.alertSuccess}>
          Юрист согласовал права
          {assessment.lawyerApprovedLawyerName ? ` — ${assessment.lawyerApprovedLawyerName}` : ''}.
          Заключение действует до{' '}
          {assessment.lawyerOpinionValidUntil
            ? formatDate(assessment.lawyerOpinionValidUntil)
            : 'бессрочно'}
          .
        </div>
      )}

      {isStaff && profileId && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setIsRequestOpen(true)}
          >
            Запросить юридическую проверку
          </button>
        </div>
      )}

      <h3 className={styles.subTitle}>Проверки интейка ({reviews.length})</h3>
      {reviews.length === 0 ? (
        <p className={styles.emptyState}>Юридических проверок пока нет.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.tableHeadCell}>Номер</th>
              <th className={styles.tableHeadCell}>Статус</th>
              <th className={styles.tableHeadCell}>Триггер</th>
              <th className={styles.tableHeadCell}>Риск</th>
              <th className={styles.tableHeadCell}>Юрист</th>
              <th className={styles.tableHeadCell}>Срок</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id}>
                <td className={styles.tableCell}>
                  <button
                    type="button"
                    className={styles.rowButton}
                    onClick={() => setActiveReviewId(review.id)}
                  >
                    {review.reviewNumber}
                  </button>
                </td>
                <td className={styles.tableCell}>
                  <span
                    className={styles.badge}
                    data-tone={LAWYER_REVIEW_STATUS_COLORS[review.effectiveStatus]}
                  >
                    {LAWYER_REVIEW_STATUS_LABELS[review.effectiveStatus]}
                  </span>
                </td>
                <td className={styles.tableCell}>{LAWYER_REVIEW_TRIGGER_LABELS[review.trigger]}</td>
                <td className={styles.tableCell}>
                  <span className={styles.badge} data-tone={RISK_LEVEL_COLORS[review.riskLevel]}>
                    {review.riskLevel}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  {review.lawyerNameSnapshot ?? review.assignedLawyerName ?? '—'}
                </td>
                <td className={styles.tableCell}>
                  {formatDate(review.dueAt)}
                  {review.isOverdue && (
                    <span className={styles.badge} data-tone="orange">
                      просрочено
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {currentOpinion && (
        <div className={styles.opinionCard}>
          <h3 className={styles.subTitle}>Действующее заключение</h3>
          <div className={styles.opinionMeta}>
            <span>{currentOpinion.lawyerNameSnapshot ?? '—'}</span>
            <span>{formatDateTime(currentOpinion.decidedAt)}</span>
            <span>
              действует до{' '}
              {currentOpinion.validUntil ? formatDate(currentOpinion.validUntil) : 'бессрочно'}
            </span>
            {currentOpinion.isExpiringSoon && (
              <span className={styles.badge} data-tone="orange">
                скоро истекает
              </span>
            )}
          </div>
          <p className={styles.opinionText}>{currentOpinion.opinionSummaryRu ?? '—'}</p>
          {currentOpinion.pendingConditionsCount > 0 && (
            <p className={styles.errorText}>
              Не выполнено условий: {currentOpinion.pendingConditionsCount}. Публикация
              заблокирована до их закрытия.
            </p>
          )}
        </div>
      )}

      {isRequestOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-label="Запросить юридическую проверку">
            <h3 className={styles.modalTitle}>Запросить юридическую проверку</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-request-question">
                Вопрос юристу (если пусто — сгенерируется из факторов риска)
              </label>
              <textarea
                id="lawyer-request-question"
                className={styles.textArea}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-request-due">
                Срок
              </label>
              <input
                id="lawyer-request-due"
                className={styles.textInput}
                type="date"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-request-lawyer">
                Назначить юриста
              </label>
              <select
                id="lawyer-request-lawyer"
                className={styles.select}
                value={assignedLawyerId}
                onChange={(event) => setAssignedLawyerId(event.target.value)}
              >
                <option value="">— не назначать —</option>
                {activeLawyers.map((lawyer) => (
                  <option key={lawyer.id} value={lawyer.id}>
                    {lawyer.fullName}
                  </option>
                ))}
              </select>
            </div>
            <label className={styles.checkboxRow} htmlFor="lawyer-request-blocks">
              <input
                id="lawyer-request-blocks"
                type="checkbox"
                checked={blocksApproval}
                onChange={(event) => setBlocksApproval(event.target.checked)}
              />
              Блокирует утверждение интейка
            </label>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button type="button" className={styles.button} onClick={closeRequest}>
                Отмена
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={requireMutation.isPending}
                onClick={() => void handleRequest()}
              >
                Запросить
              </button>
            </div>
          </div>
        </div>
      )}

      <LawyerReviewDrawer
        reviewId={activeReviewId}
        onClose={() => setActiveReviewId(null)}
        isStaff={isStaff}
        isAdmin={isAdmin}
        canDecide={canDecide}
      />
    </div>
  );
};
