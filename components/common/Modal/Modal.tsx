'use client';

import type { FC } from 'react';
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
    isLoading = false,
    isConfirmDisabled = false,
    onConfirm,
    onCancel,
  } = props;

  // If modal is closed, don't render anything
  if (!isOpen) {
    return null;
  }

  /**
   * Overlay click handler (close modal)
   */
  const handleOverlayClick = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  /**
   * Prevent modal click propagation to overlay
   */
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  /**
   * Confirm handler
   */
  const handleConfirm = () => {
    onConfirm();
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
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={handleModalClick}>
        {/* Header with title and close button */}
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button
            className={styles.closeButton}
            disabled={isLoading}
            onClick={handleCancel}
            type="button"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Modal body - arbitrary content */}
        <div className={styles.body}>{children}</div>

        {/* Footer with buttons */}
        <div className={styles.footer}>
          <button
            className={`${styles.button} ${styles.cancelButton}`}
            disabled={isLoading}
            onClick={handleCancel}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={`${styles.button} ${styles.confirmButton} ${styles[confirmVariant]}`}
            disabled={isLoading || isConfirmDisabled}
            onClick={handleConfirm}
            type="button"
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
