'use client';

import { useState, type FC } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import Link from 'next/link';
import {
  useMarkAllRightsNotificationsRead,
  useMarkRightsNotificationRead,
  useRightsNotifications,
} from '@/api/hooks/useRightsAgent';
import { RIGHTS_NOTIFICATION_TYPE_LABELS_RU } from '@/types/api-schema/rights-agent';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  RightsNotificationSeverity,
  RightsNotificationType,
} from '@/types/api-schema/rights-agent';
import styles from './RightsNotificationsList.module.scss';

const PAGE_SIZE = 20;

const NOTIFICATION_TYPES: RightsNotificationType[] = [
  'AGENT_REPORT_RECEIVED',
  'AGENT_REPORT_VALIDATION_FAILED',
  'AGENT_REPORT_MATERIALIZED',
  'AGENT_REPORT_MATERIALIZATION_FAILED',
  'AGENT_TOKEN_ISSUED',
  'AGENT_TOKEN_REVOKED',
  'HUMAN_REVIEW_REQUIRED',
  'RECHECK_DUE',
  'RECHECK_OVERDUE',
  'RECHECK_TASK_OPENED',
  'RECHECK_COMPLETED',
  'LEGAL_CHANGE_APPLIED',
  'LAWYER_REVIEW_REQUIRED',
  'OTHER',
];

const SEVERITIES: RightsNotificationSeverity[] = ['INFO', 'SUCCESS', 'WARNING', 'ERROR'];

const SEVERITY_ICONS: Record<RightsNotificationSeverity, typeof Info> = {
  INFO: Info,
  SUCCESS: CheckCircle,
  WARNING: AlertTriangle,
  ERROR: XCircle,
};

export interface RightsNotificationsListProps {
  lang: SupportedLang;
}

export const RightsNotificationsList: FC<RightsNotificationsListProps> = ({ lang }) => {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState<RightsNotificationType | ''>('');
  const [severity, setSeverity] = useState<RightsNotificationSeverity | ''>('');

  const params = {
    page,
    limit: PAGE_SIZE,
    ...(unreadOnly ? { unreadOnly: true } : {}),
    ...(type ? { type } : {}),
    ...(severity ? { severity } : {}),
  };

  const notificationsQuery = useRightsNotifications(params);
  const markReadMutation = useMarkRightsNotificationRead();
  const markAllReadMutation = useMarkAllRightsNotificationsRead();

  const items = notificationsQuery.data?.items ?? [];
  const total = notificationsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Rights Notifications</h1>
        <button
          type="button"
          className={styles.actionBtnSecondary}
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
        >
          Отметить все прочитанными
        </button>
      </div>

      <div className={styles.filters}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => {
              setUnreadOnly(event.target.checked);
              setPage(1);
            }}
          />
          Только непрочитанные
        </label>

        <select
          className={styles.select}
          aria-label="Filter by type"
          value={type}
          onChange={(event) => {
            setType(event.target.value as RightsNotificationType | '');
            setPage(1);
          }}
        >
          <option value="">Все типы</option>
          {NOTIFICATION_TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          aria-label="Filter by severity"
          value={severity}
          onChange={(event) => {
            setSeverity(event.target.value as RightsNotificationSeverity | '');
            setPage(1);
          }}
        >
          <option value="">Любая важность</option>
          {SEVERITIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Уведомлений пока нет.</p>
      ) : (
        <div className={styles.list}>
          {items.map((notification) => {
            const SeverityIcon = SEVERITY_ICONS[notification.severity];
            return (
              <div
                key={notification.id}
                className={`${styles.item} ${notification.isRead ? '' : styles.itemUnread}`}
              >
                <SeverityIcon size={18} />
                <div className={styles.itemBody}>
                  <p className={styles.itemTitle}>{notification.titleRu}</p>
                  <p className={styles.itemMessage}>{notification.messageRu}</p>
                  <div className={styles.itemMeta}>
                    <span className={styles.badge} data-severity={notification.severity}>
                      {RIGHTS_NOTIFICATION_TYPE_LABELS_RU[notification.type] ?? notification.type}
                    </span>
                    <span>{new Date(notification.createdAt).toLocaleString()}</span>
                    {notification.rightsIntakeId ? (
                      <Link
                        className={styles.itemLink}
                        href={`/admin/${lang}/rights-intakes/${notification.rightsIntakeId}`}
                      >
                        Открыть интейк
                      </Link>
                    ) : (
                      // No intake link (e.g. a version-scoped recheck task) → open the book
                      // version instead; its Rights tab holds the recheck panel.
                      notification.bookVersionId && (
                        <Link
                          className={styles.itemLink}
                          href={`/admin/${lang}/books/versions/${notification.bookVersionId}`}
                        >
                          Открыть версию книги
                        </Link>
                      )
                    )}
                    {!notification.isRead && (
                      <button
                        type="button"
                        className={styles.itemLink}
                        onClick={() => markReadMutation.mutate(notification.id)}
                      >
                        Отметить прочитанным
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.actionBtnSecondary}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
          >
            Назад
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className={styles.actionBtnSecondary}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
};
