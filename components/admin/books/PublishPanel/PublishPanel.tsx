'use client';

import type { FC } from 'react';
import { AlertTriangle, Calendar, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { PublishPanelProps } from './PublishPanel.types';
import { PublishConfirmModal } from './PublishConfirmModal';
import styles from './PublishPanel.module.scss';
import { PublishStatusBadge } from './PublishStatusBadge';
import { usePublishPanel } from './usePublishPanel';

export const PublishPanel: FC<PublishPanelProps> = (props) => {
  const { status, publishBlockedReason } = props;
  const {
    showConfirmModal,
    actionType,
    isPublished,
    isDraft,
    isArchived,
    isLoading,
    canPublish,
    isGateError,
    blockingReasons,
    warnings,
    handleOpenConfirmModal,
    handleCloseConfirmModal,
    handleConfirmAction,
  } = usePublishPanel(props);

  const hasLegacyBlockingReason = Boolean(publishBlockedReason);
  const isPublishDisabled = isArchived || hasLegacyBlockingReason || (!isPublished && !canPublish);

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.header}>
          <Calendar className={styles.icon} size={20} />
          <h3 className={styles.title}>Publish</h3>
        </div>

        <PublishStatusBadge
          isArchived={isArchived}
          isDraft={isDraft}
          isPublished={isPublished}
          status={status}
        />

        {hasLegacyBlockingReason && !isPublished && (
          <div className={styles.warning} role="alert">
            <p className={styles.warningText}>{publishBlockedReason}</p>
          </div>
        )}

        {blockingReasons.length > 0 && !isPublished && (
          <div className={styles.gateBlockedSection} role="alert">
            <div className={styles.gateHeader}>
              <ShieldAlert size={18} />
              <span className={styles.gateTitle}>Publication blocked by rights gate</span>
            </div>
            <ul className={styles.reasonList}>
              {blockingReasons.map((reason) => (
                <li key={reason.code} className={styles.reasonItem}>
                  <span className={styles.reasonCode}>{reason.code}</span>
                  <span className={styles.reasonMessage}>{reason.messageRu}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isGateError && blockingReasons.length === 0 && !isPublished && (
          <div className={styles.gateBlockedSection} role="alert">
            <div className={styles.gateHeader}>
              <ShieldAlert size={18} />
              <span className={styles.gateTitle}>Failed to check publication gate</span>
            </div>
            <p className={styles.gateText}>
              Unable to verify publication permissions. Publishing is disabled.
            </p>
          </div>
        )}

        {warnings.length > 0 && !isPublished && (
          <div className={styles.warningSection}>
            <div className={styles.warningHeader}>
              <AlertTriangle size={16} />
              <span className={styles.warningTitle}>Warnings</span>
            </div>
            <ul className={styles.reasonList}>
              {warnings.map((w) => (
                <li key={w.code} className={styles.reasonItem}>
                  <span className={styles.reasonCode}>{w.code}</span>
                  <span className={styles.reasonMessage}>{w.messageRu}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.actions}>
          {isPublished ? (
            <Button
              variant="warning"
              fullWidth
              loading={isLoading}
              onClick={() => handleOpenConfirmModal('unpublish')}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              variant="success"
              fullWidth
              loading={isLoading}
              disabled={isPublishDisabled}
              onClick={() => handleOpenConfirmModal('publish')}
            >
              Publish
            </Button>
          )}
        </div>

        <div className={styles.info}>
          <p className={styles.infoText}>
            {isPublished && 'This version is publicly visible to all users.'}
            {isDraft && 'This version is not visible to users. Publish it to make it public.'}
            {isArchived &&
              'This version is archived and cannot be published. Contact an administrator if you need to restore it.'}
          </p>
        </div>
      </div>

      <PublishConfirmModal
        actionType={actionType}
        isLoading={isLoading}
        isOpen={showConfirmModal}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmAction}
      />
    </>
  );
};
