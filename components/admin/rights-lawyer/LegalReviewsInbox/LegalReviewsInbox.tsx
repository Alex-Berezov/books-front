'use client';

import { useMemo, useState, type FC } from 'react';
import { useSession } from 'next-auth/react';
import { useLawyerReviews, useLawyers, useRunLawyerExpiryScan } from '@/api/hooks/useRightsLawyer';
import type {
  LawyerExpiryScanResult,
  ListLawyerReviewsParams,
  RightsLawyerReviewStatus,
  RightsLawyerReviewTrigger,
  RightsRiskLevel,
} from '@/types/api-schema/rights-lawyer';
import {
  LAWYER_REVIEW_STATUS_COLORS,
  LAWYER_REVIEW_STATUS_LABELS,
  LAWYER_REVIEW_TRIGGER_LABELS,
  RISK_LEVEL_COLORS,
} from '../lawyerLabels';
import styles from './LegalReviewsInbox.module.scss';
import { LawyerReviewDrawer } from '../LawyerReviewDrawer/LawyerReviewDrawer';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: RightsLawyerReviewStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'APPROVED',
  'APPROVED_WITH_CONDITIONS',
  'REJECTED',
  'WITHDRAWN',
  'EXPIRED',
];

const RISK_OPTIONS: RightsRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const TRIGGER_OPTIONS: RightsLawyerReviewTrigger[] = [
  'AGENT_REQUESTED',
  'HIGH_RISK_POLICY',
  'MANUAL_REQUEST',
  'RIGHTS_CLAIM',
  'LEGAL_CHANGE',
  'LICENSE_REQUIRED',
  'OTHER',
];

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString() : '—';

/** Global legal review inbox. Visible to admin, content manager and lawyer. */
export const LegalReviewsInbox: FC = () => {
  const { data: session } = useSession();
  const roles = session?.user?.roles ?? [];
  const isAdmin = roles.includes('admin');
  const isStaff = isAdmin || roles.includes('content_manager');
  const canDecide = isAdmin || roles.includes('lawyer');

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<RightsLawyerReviewStatus | ''>('');
  const [riskLevel, setRiskLevel] = useState<RightsRiskLevel | ''>('');
  const [trigger, setTrigger] = useState<RightsLawyerReviewTrigger | ''>('');
  const [assignedLawyerId, setAssignedLawyerId] = useState('');
  const [mine, setMine] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [expiringWithinDays, setExpiringWithinDays] = useState('');
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<LawyerExpiryScanResult | null>(null);

  const params: ListLawyerReviewsParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(status ? { status } : {}),
      ...(riskLevel ? { riskLevel } : {}),
      ...(trigger ? { trigger } : {}),
      ...(assignedLawyerId ? { assignedLawyerId } : {}),
      ...(mine ? { mine: true } : {}),
      ...(overdueOnly ? { overdueOnly: true } : {}),
      ...(expiringWithinDays ? { expiringWithinDays: Number(expiringWithinDays) } : {}),
    }),
    [page, status, riskLevel, trigger, assignedLawyerId, mine, overdueOnly, expiringWithinDays]
  );

  const reviewsQuery = useLawyerReviews(params);
  const lawyersQuery = useLawyers({ isActive: true, limit: 100 });
  const scanMutation = useRunLawyerExpiryScan({
    onSuccess: (result) => setScanResult(result),
  });

  const reviews = useMemo(() => reviewsQuery.data?.items ?? [], [reviewsQuery.data]);
  const total = reviewsQuery.data?.total ?? 0;
  const lawyers = useMemo(() => lawyersQuery.data?.items ?? [], [lawyersQuery.data]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetPage = () => setPage(1);

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Юридические проверки</h2>
      <p className={styles.sectionHint}>
        Инбокс юридического workflow: здесь видно, какие проверки ждут заключения, какие просрочены
        и у каких заключений скоро истекает срок действия.
      </p>

      <div className={styles.filters}>
        <div className={styles.filterField}>
          <label className={styles.fieldLabel} htmlFor="inbox-status">
            Статус
          </label>
          <select
            id="inbox-status"
            className={styles.select}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as RightsLawyerReviewStatus | '');
              resetPage();
            }}
          >
            <option value="">Все</option>
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {LAWYER_REVIEW_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterField}>
          <label className={styles.fieldLabel} htmlFor="inbox-risk">
            Риск
          </label>
          <select
            id="inbox-risk"
            className={styles.select}
            value={riskLevel}
            onChange={(event) => {
              setRiskLevel(event.target.value as RightsRiskLevel | '');
              resetPage();
            }}
          >
            <option value="">Все</option>
            {RISK_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterField}>
          <label className={styles.fieldLabel} htmlFor="inbox-trigger">
            Триггер
          </label>
          <select
            id="inbox-trigger"
            className={styles.select}
            value={trigger}
            onChange={(event) => {
              setTrigger(event.target.value as RightsLawyerReviewTrigger | '');
              resetPage();
            }}
          >
            <option value="">Все</option>
            {TRIGGER_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {LAWYER_REVIEW_TRIGGER_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterField}>
          <label className={styles.fieldLabel} htmlFor="inbox-lawyer">
            Юрист
          </label>
          <select
            id="inbox-lawyer"
            className={styles.select}
            value={assignedLawyerId}
            onChange={(event) => {
              setAssignedLawyerId(event.target.value);
              resetPage();
            }}
          >
            <option value="">Все</option>
            {lawyers.map((lawyer) => (
              <option key={lawyer.id} value={lawyer.id}>
                {lawyer.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterField}>
          <label className={styles.fieldLabel} htmlFor="inbox-expiring">
            Истекают в течение, дней
          </label>
          <input
            id="inbox-expiring"
            className={styles.textInput}
            type="number"
            min={0}
            value={expiringWithinDays}
            onChange={(event) => {
              setExpiringWithinDays(event.target.value);
              resetPage();
            }}
          />
        </div>

        <label className={styles.checkboxRow} htmlFor="inbox-mine">
          <input
            id="inbox-mine"
            type="checkbox"
            checked={mine}
            onChange={(event) => {
              setMine(event.target.checked);
              resetPage();
            }}
          />
          Только мои
        </label>

        <label className={styles.checkboxRow} htmlFor="inbox-overdue">
          <input
            id="inbox-overdue"
            type="checkbox"
            checked={overdueOnly}
            onChange={(event) => {
              setOverdueOnly(event.target.checked);
              resetPage();
            }}
          />
          Только просроченные
        </label>

        {isAdmin && (
          <button
            type="button"
            className={styles.button}
            disabled={scanMutation.isPending}
            onClick={() => void scanMutation.mutateAsync()}
          >
            Скан истечений
          </button>
        )}
      </div>

      {scanResult && (
        <p className={styles.scanResult}>
          Проверено: {scanResult.checkedCount}, истекло: {scanResult.expiredCount}, скоро истекают:{' '}
          {scanResult.expiringSoonCount}, отправлено уведомлений: {scanResult.notificationsSent}.
        </p>
      )}

      {reviewsQuery.isLoading && <p className={styles.emptyState}>Загрузка…</p>}
      {reviewsQuery.isError && (
        <p className={styles.errorText}>Не удалось загрузить юридические проверки.</p>
      )}

      {!reviewsQuery.isLoading && reviews.length === 0 && (
        <p className={styles.emptyState}>Юридических проверок по этим фильтрам нет.</p>
      )}

      {reviews.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.tableHeadCell}>Номер</th>
              <th className={styles.tableHeadCell}>Заголовок</th>
              <th className={styles.tableHeadCell}>Статус</th>
              <th className={styles.tableHeadCell}>Риск</th>
              <th className={styles.tableHeadCell}>Юрист</th>
              <th className={styles.tableHeadCell}>Срок</th>
              <th className={styles.tableHeadCell}>Действует до</th>
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
                <td className={styles.tableCell}>{review.intakeTitle ?? review.titleRu}</td>
                <td className={styles.tableCell}>
                  <span
                    className={styles.badge}
                    data-tone={LAWYER_REVIEW_STATUS_COLORS[review.effectiveStatus]}
                  >
                    {LAWYER_REVIEW_STATUS_LABELS[review.effectiveStatus]}
                  </span>
                </td>
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
                <td className={styles.tableCell}>
                  {review.validUntil ? formatDate(review.validUntil) : '—'}
                  {review.isExpiringSoon && (
                    <span className={styles.badge} data-tone="orange">
                      скоро
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {total > PAGE_SIZE && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.button}
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Назад
          </button>
          <span>
            Страница {page} из {totalPages} · всего {total}
          </span>
          <button
            type="button"
            className={styles.button}
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Вперёд
          </button>
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
