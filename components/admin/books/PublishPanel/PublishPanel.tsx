'use client';

import type { FC } from 'react';
import { Calendar } from 'lucide-react';
import type { PublishPanelProps } from './PublishPanel.types';
import { PublishConfirmModal } from './PublishConfirmModal';
import styles from './PublishPanel.module.scss';
import { PublishStatusBadge } from './PublishStatusBadge';
import { usePublishPanel } from './usePublishPanel';

/**
 * Book version publication management panel
 *
 * Allows publishing or unpublishing book version
 * with action confirmation.
 */
export const PublishPanel: FC<PublishPanelProps> = (props) => {
  const { status } = props;
  const {
    showConfirmModal,
    actionType,
    isPublished,
    isDraft,
    isArchived,
    isLoading,
    handleOpenConfirmModal,
    handleCloseConfirmModal,
    handleConfirmAction,
  } = usePublishPanel(props);

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

        <div className={styles.actions}>
          {isPublished ? (
            <button
              className={`${styles.button} ${styles.unpublishButton}`}
              disabled={isLoading}
              onClick={() => handleOpenConfirmModal('unpublish')}
              type="button"
            >
              {isLoading ? 'Processing...' : 'Unpublish'}
            </button>
          ) : (
            <button
              className={`${styles.button} ${styles.publishButton}`}
              disabled={isLoading || isArchived}
              onClick={() => handleOpenConfirmModal('publish')}
              type="button"
            >
              {isLoading ? 'Publishing...' : 'Publish'}
            </button>
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
