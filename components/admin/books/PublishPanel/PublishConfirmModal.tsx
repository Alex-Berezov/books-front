import { useRef } from 'react';
import type { FC, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Button } from '@/components/common/Button';
import { useDialogFocus } from '@/lib/hooks/useDialogFocus';
import styles from './PublishPanel.module.scss';

interface PublishConfirmModalProps {
  isOpen: boolean;
  actionType: 'publish' | 'unpublish';
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const PublishConfirmModal: FC<PublishConfirmModalProps> = ({
  isOpen,
  actionType,
  isLoading,
  onClose,
  onConfirm,
}) => {
  /**
   * 🔴 Фокус окна берётся тем же хуком, что у общего `Modal` (`LEGACY-041`). Одной
   * разметки мало: окно открывают кнопкой на странице, фокус остаётся на ней, и Escape
   * до обработчика подложки не всплывает вовсе — окно не закрывается, а `aria-modal`
   * при этом уже утверждает, что страница под подложкой недоступна.
   */
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, isOpen);

  if (!isOpen) return null;

  /**
   * Закрывает только клик по самой подложке. `stopPropagation` на теле окна был
   * обработчиком на неинтерактивном элементе — он требовал клавиатурного близнеца
   * там, где нажимать нечего (`LEGACY-041`, образец — `components/common/Modal`).
   */
  const handleOverlayClick = (e: ReactMouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (!isLoading) onClose();
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) onClose();
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        className={styles.modal}
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-confirm-title"
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle} id="publish-confirm-title">
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
          <Button variant="secondary" disabled={isLoading} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={actionType === 'publish' ? 'success' : 'warning'}
            loading={isLoading}
            onClick={onConfirm}
          >
            {actionType === 'publish' ? 'Publish' : 'Unpublish'}
          </Button>
        </div>
      </div>
    </div>
  );
};
