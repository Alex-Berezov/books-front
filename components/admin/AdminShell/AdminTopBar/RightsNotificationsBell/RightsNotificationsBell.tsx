'use client';

import { useEffect, useRef, useState, type FC } from 'react';
import { AlertTriangle, Bell, CheckCircle, Info, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  useMarkAllRightsNotificationsRead,
  useMarkRightsNotificationRead,
  useRightsNotifications,
  useRightsNotificationsUnreadCount,
} from '@/api/hooks/useRightsAgent';
import type {
  RightsNotification,
  RightsNotificationSeverity,
} from '@/types/api-schema/rights-agent';
import styles from './RightsNotificationsBell.module.scss';

const DROPDOWN_LIMIT = 10;

const SEVERITY_ICONS: Record<RightsNotificationSeverity, typeof Info> = {
  INFO: Info,
  SUCCESS: CheckCircle,
  WARNING: AlertTriangle,
  ERROR: XCircle,
};

const formatRelativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};

export const RightsNotificationsBell: FC = () => {
  const params = useParams();
  const router = useRouter();
  const lang = typeof params?.lang === 'string' ? params.lang : 'en';

  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const unreadCountQuery = useRightsNotificationsUnreadCount();
  const notificationsQuery = useRightsNotifications({ limit: DROPDOWN_LIMIT }, { enabled: isOpen });
  const markReadMutation = useMarkRightsNotificationRead();
  const markAllReadMutation = useMarkAllRightsNotificationsRead();

  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;
  const notifications = notificationsQuery.data?.items ?? [];

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = async (notification: RightsNotification) => {
    if (!notification.isRead) {
      await markReadMutation.mutateAsync(notification.id).catch(() => undefined);
    }
    setIsOpen(false);
    if (notification.rightsIntakeId) {
      router.push(`/admin/${lang}/rights-intakes/${notification.rightsIntakeId}`);
    }
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.bellButton}
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Rights notifications"
        aria-expanded={isOpen}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <p className={styles.dropdownTitle}>Уведомления</p>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || unreadCount === 0}
            >
              Отметить все прочитанными
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className={styles.empty}>Уведомлений пока нет.</p>
          ) : (
            notifications.map((notification) => {
              const SeverityIcon = SEVERITY_ICONS[notification.severity];
              return (
                <button
                  type="button"
                  key={notification.id}
                  className={`${styles.item} ${notification.isRead ? '' : styles.itemUnread}`}
                  onClick={() => handleItemClick(notification)}
                >
                  <SeverityIcon
                    size={16}
                    className={styles.severityIcon}
                    data-severity={notification.severity}
                  />
                  <span className={styles.itemBody}>
                    <span className={styles.itemTitle}>{notification.titleRu}</span>
                    <span className={styles.itemMessage}>{notification.messageRu}</span>
                    <span className={styles.itemTime}>
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })
          )}

          <div className={styles.footer}>
            <Link
              className={styles.footerLink}
              href={`/admin/${lang}/rights-notifications`}
              onClick={() => setIsOpen(false)}
            >
              Все уведомления
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
