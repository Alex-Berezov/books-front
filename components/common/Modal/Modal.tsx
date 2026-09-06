'use client';

import { useId, useRef, type FC } from 'react';
import { Button } from '@/components/common/Button';
import { useDialogFocus } from '@/lib/hooks/useDialogFocus';
import type { ModalProps } from './Modal.types';
import styles from './Modal.module.scss';

/**
 * Reusable universal modal component
 *
 * Modal with flexible configuration for various scenarios:
 * - Action confirmation (delete, publish, etc.)
 * - Information display
 * - Data input forms
 * - Any custom content via children
 *
 * Features:
 * - Custom title with close button
 * - Arbitrary content (children)
 * - Customizable footer buttons (texts and variants)
 * - Loading state support
 * - Close on overlay or cross click
 * - Smooth animations
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <Modal
 *   isOpen={isOpen}
 *   title="Delete Page"
 *   confirmText="Delete"
 *   confirmVariant="danger"
 *   onConfirm={() => deletePage(id)}
 *   onCancel={() => setIsOpen(false)}
 * >
 *   <p>Are you sure you want to delete "{pageTitle}"?</p>
 *   <p>This action cannot be undone.</p>
 * </Modal>
 * ```
 */
export const Modal: FC<ModalProps> = (props) => {
  const {
    isOpen,
    title,
    children,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'primary',
    size = 'md',
    isLoading = false,
    isConfirmDisabled = false,
    showFooter = true,
    onConfirm,
    onCancel,
  } = props;

  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Фокус окна целиком — забрать, замкнуть Tab внутри, вернуть при закрытии
  // (`lib/hooks/useDialogFocus.ts`, `LEGACY-041`).
  useDialogFocus(dialogRef, isOpen);

  /**
   * Escape закрывает окно.
   */
  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onCancel();
    }
  };

  // If modal is closed, don't render anything
  if (!isOpen) {
    return null;
  }

  /**
   * Overlay click handler (close modal).
   *
   * Закрывает только клик по самой подложке. Раньше клик внутри модалки гасился
   * `stopPropagation` на её теле — обработчик на неинтерактивном элементе, который
   * требовал клавиатурного близнеца там, где нажимать нечего (`LEGACY-041`).
   */
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (!isLoading) {
      onCancel();
    }
  };

  /**
   * Confirm handler
   */
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  /**
   * Cancel handler
   */
  const handleCancel = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    // Подложка — не кнопка: `role="presentation"` снимает с неё и роль, и остановку
    // табуляции. Роль `button` на элементе во весь экран давала скринридеру безымянную
    // кнопку со склеенным содержимым окна и лишний таб-стоп перед ним.
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleDialogKeyDown}
      role="presentation"
    >
      <div
        className={`${styles.modal} ${styles[size]}`}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {/* Header with title and close button */}
        <div className={styles.header}>
          <h3 className={styles.title} id={titleId}>
            {title}
          </h3>
          <Button
            className={styles.closeButton}
            disabled={isLoading}
            onClick={handleCancel}
            variant="ghost"
            size="sm"
            ariaLabel="Close modal"
          >
            ×
          </Button>
        </div>

        {/* Modal body - arbitrary content */}
        <div className={styles.body}>{children}</div>

        {/* Footer with buttons */}
        {showFooter && (
          <div className={styles.footer}>
            <Button variant="secondary" disabled={isLoading} onClick={handleCancel}>
              {cancelText}
            </Button>
            {onConfirm && (
              <Button
                variant={confirmVariant}
                disabled={isConfirmDisabled}
                loading={isLoading}
                onClick={handleConfirm}
              >
                {confirmText}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
