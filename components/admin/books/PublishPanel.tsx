'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { usePublishVersion, useUnpublishVersion } from '@/api/hooks';
import type { PublicationStatus } from '@/types/api-schema';
import styles from './PublishPanel.module.scss';

export interface PublishPanelProps {
  /** ID версии книги */
  versionId: string;
  /** Текущий статус версии */
  status: PublicationStatus;
  /** Callback при успешной публикации */
  onPublishSuccess?: () => void;
  /** Callback при успешном снятии с публикации */
  onUnpublishSuccess?: () => void;
}

/**
 * Панель управления публикацией версии книги
 *
 * Позволяет публиковать или снимать с публикации версию книги
 * с подтверждением действия.
 */
export const PublishPanel: FC<PublishPanelProps> = (props) => {
  const { versionId, status, onPublishSuccess, onUnpublishSuccess } = props;

  // Состояние модального окна подтверждения
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState<'publish' | 'unpublish'>('publish');

  // Мутации для публикации/снятия с публикации
  const publishMutation = usePublishVersion({
    onSuccess: () => {
      setShowConfirmModal(false);
      onPublishSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to publish version:', error);
      // TODO: Показать toast с ошибкой
    },
  });

  const unpublishMutation = useUnpublishVersion({
    onSuccess: () => {
      setShowConfirmModal(false);
      onUnpublishSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to unpublish version:', error);
      // TODO: Показать toast с ошибкой
    },
  });

  const isPublished = status === 'published';
  const isDraft = status === 'draft';
  const isArchived = status === 'archived';
  const isLoading = publishMutation.isPending || unpublishMutation.isPending;

  /**
   * Открыть модальное окно подтверждения
   */
  const handleOpenConfirmModal = (action: 'publish' | 'unpublish') => {
    setActionType(action);
    setShowConfirmModal(true);
  };

  /**
   * Закрыть модальное окно подтверждения
   */
  const handleCloseConfirmModal = () => {
    setShowConfirmModal(false);
  };

  /**
   * Подтвердить действие
   */
  const handleConfirmAction = () => {
    if (actionType === 'publish') {
      publishMutation.mutate(versionId);
    } else {
      unpublishMutation.mutate(versionId);
    }
  };

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>Publication Status</h3>
        </div>

        <div className={styles.statusSection}>
          <div className={styles.statusLabel}>Current Status:</div>
          <div className={`${styles.statusBadge} ${styles[status]}`}>
            {isPublished && '✓ Published'}
            {isDraft && '○ Draft'}
            {isArchived && '📦 Archived'}
          </div>
        </div>

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

      {/* Модальное окно подтверждения */}
      {showConfirmModal && (
        <div className={styles.modalOverlay} onClick={handleCloseConfirmModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {actionType === 'publish' ? 'Publish Version' : 'Unpublish Version'}
              </h3>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                {actionType === 'publish'
                  ? 'Are you sure you want to publish this version? It will become publicly visible to all users.'
                  : 'Are you sure you want to unpublish this version? It will no longer be visible to users.'}
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                className={`${styles.modalButton} ${styles.cancelButton}`}
                disabled={isLoading}
                onClick={handleCloseConfirmModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className={`${styles.modalButton} ${
                  actionType === 'publish'
                    ? styles.confirmPublishButton
                    : styles.confirmUnpublishButton
                }`}
                disabled={isLoading}
                onClick={handleConfirmAction}
                type="button"
              >
                {isLoading ? 'Processing...' : actionType === 'publish' ? 'Publish' : 'Unpublish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
