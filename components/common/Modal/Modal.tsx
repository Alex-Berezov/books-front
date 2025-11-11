'use client';

import type { FC } from 'react';
import type { ModalProps } from './Modal.types';
import styles from './Modal.module.scss';

/**
 * Переиспользуемый универсальный компонент модального окна
 *
 * Модалка с гибкой настройкой для различных сценариев:
 * - Подтверждение действий (удаление, публикация и т.д.)
 * - Отображение информации
 * - Формы ввода данных
 * - Любой кастомный контент через children
 *
 * Особенности:
 * - Кастомный заголовок с кнопкой закрытия
 * - Произвольное содержимое (children)
 * - Настраиваемые кнопки футера (тексты и варианты)
 * - Поддержка состояния загрузки
 * - Закрытие по оверлею или крестику
 * - Плавные анимации
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
    onConfirm,
    onCancel,
  } = props;

  // Если модалка закрыта, ничего не рендерим
  if (!isOpen) {
    return null;
  }

  /**
   * Обработчик клика по оверлею (закрытие модалки)
   */
  const handleOverlayClick = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  /**
   * Предотвращаем всплытие клика по модалке к оверлею
   */
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  /**
   * Обработчик подтверждения
   */
  const handleConfirm = () => {
    onConfirm();
  };

  /**
   * Обработчик отмены
   */
  const handleCancel = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={handleModalClick}>
        {/* Header с заголовком и крестиком */}
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

        {/* Тело модалки - произвольный контент */}
        <div className={styles.body}>{children}</div>

        {/* Footer с кнопками */}
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
            disabled={isLoading}
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
