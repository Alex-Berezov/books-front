'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { usePublishPage, useUnpublishPage } from '@/api/hooks';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PageResponse, PublicationStatus } from '@/types/api-schema';
import styles from './PagePublishPanel.module.scss';

export interface PagePublishPanelProps {
  /** Текущий язык интерфейса */
  lang: SupportedLang;
  /** Данные страницы */
  page: PageResponse;
  /** Callback при успешной публикации */
  onPublishSuccess?: () => void;
  /** Callback при успешном снятии с публикации */
  onUnpublishSuccess?: () => void;
}

/**
 * Панель управления публикацией CMS страницы
 *
 * Позволяет публиковать или снимать с публикации страницу
 * с подтверждением действия.
 */
export const PagePublishPanel: FC<PagePublishPanelProps> = (props) => {
  const { lang, page, onPublishSuccess, onUnpublishSuccess } = props;

  // Состояние модального окна подтверждения
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState<'publish' | 'unpublish'>('publish');

  // Мутации для публикации/снятия с публикации
  const publishMutation = usePublishPage({
    onSuccess: () => {
      setShowConfirmModal(false);
      onPublishSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to publish page:', error);
      alert(`Failed to publish page: ${error.message}`);
    },
  });

  const unpublishMutation = useUnpublishPage({
    onSuccess: () => {
      setShowConfirmModal(false);
      onUnpublishSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to unpublish page:', error);
      alert(`Failed to unpublish page: ${error.message}`);
    },
  });

  const status: PublicationStatus = page.status;
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
      publishMutation.mutate({ pageId: page.id, lang });
    } else {
      unpublishMutation.mutate({ pageId: page.id, lang });
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
            {isPublished && 'This page is publicly visible to all users.'}
            {isDraft && 'This page is not visible to users. Publish it to make it public.'}
            {isArchived &&
              'This page is archived and cannot be published. Contact an administrator if you need to restore it.'}
          </p>
        </div>

        {/* Дополнительная информация */}
        <div className={styles.metadata}>
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Language:</span>
            <span className={styles.metadataValue}>{page.language.toUpperCase()}</span>
          </div>
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Created:</span>
            <span className={styles.metadataValue}>
              {new Date(page.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Updated:</span>
            <span className={styles.metadataValue}>
              {new Date(page.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Модальное окно подтверждения */}
      {showConfirmModal && (
        <div className={styles.modalOverlay} onClick={handleCloseConfirmModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {actionType === 'publish' ? 'Publish Page' : 'Unpublish Page'}
              </h3>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                {actionType === 'publish'
                  ? 'Are you sure you want to publish this page? It will become publicly visible to all users.'
                  : 'Are you sure you want to unpublish this page? It will no longer be visible to users.'}
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
