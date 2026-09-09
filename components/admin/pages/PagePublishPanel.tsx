'use client';

import { useRef, useState } from 'react';
import type { FC, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useSnackbar } from 'notistack';
import { usePublishPage, useUnpublishPage } from '@/api/hooks';
import { Button } from '@/components/common/Button';
import { useDialogFocus } from '@/lib/hooks/useDialogFocus';
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
  const { enqueueSnackbar } = useSnackbar();

  // Состояние модального окна подтверждения
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState<'publish' | 'unpublish'>('publish');

  // Мутации для публикации/снятия с публикации
  const publishMutation = usePublishPage({
    onSuccess: () => {
      setShowConfirmModal(false);
      enqueueSnackbar('Page published successfully', { variant: 'success' });
      onPublishSuccess?.();
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to publish page: ${error.message}`, { variant: 'error' });
    },
  });

  const unpublishMutation = useUnpublishPage({
    onSuccess: () => {
      setShowConfirmModal(false);
      enqueueSnackbar('Page unpublished successfully', { variant: 'success' });
      onUnpublishSuccess?.();
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to unpublish page: ${error.message}`, { variant: 'error' });
    },
  });

  const status: PublicationStatus = page.status;
  const isPublished = status === 'published';
  const isDraft = status === 'draft';
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
  /**
   * 🔴 Фокус окна берётся тем же хуком, что у общего `Modal` (`LEGACY-041`). Одной
   * разметки мало: окно открывают кнопкой на странице, фокус остаётся на ней, и Escape
   * до обработчика подложки не всплывает вовсе — окно не закрывается, а `aria-modal`
   * при этом уже утверждает, что страница под подложкой недоступна.
   */
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, showConfirmModal);

  const handleCloseConfirmModal = () => {
    setShowConfirmModal(false);
  };

  /**
   * Закрывает только клик по самой подложке. `stopPropagation` на теле окна был
   * обработчиком на неинтерактивном элементе — он требовал клавиатурного близнеца
   * там, где нажимать нечего (`LEGACY-041`, образец — `components/common/Modal`).
   */
  const handleOverlayClick = (e: ReactMouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (!isLoading) handleCloseConfirmModal();
  };

  const handleOverlayKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) handleCloseConfirmModal();
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
          </div>
        </div>

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
              onClick={() => handleOpenConfirmModal('publish')}
            >
              Publish
            </Button>
          )}
        </div>

        <div className={styles.info}>
          <p className={styles.infoText}>
            {isPublished && 'This page is publicly visible to all users.'}
            {isDraft && 'This page is not visible to users. Publish it to make it public.'}
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
        <div
          className={styles.modalOverlay}
          onClick={handleOverlayClick}
          onKeyDown={handleOverlayKeyDown}
          role="presentation"
        >
          <div
            className={styles.modal}
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-publish-confirm-title"
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} id="page-publish-confirm-title">
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
              <Button variant="secondary" disabled={isLoading} onClick={handleCloseConfirmModal}>
                Cancel
              </Button>
              <Button
                variant={actionType === 'publish' ? 'success' : 'warning'}
                loading={isLoading}
                onClick={handleConfirmAction}
              >
                {actionType === 'publish' ? 'Publish' : 'Unpublish'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
