import type { ReactNode } from 'react';

/**
 * Пропсы для компонента Modal
 */
export interface ModalProps {
  /** Показывать ли модалку */
  isOpen: boolean;
  /** Заголовок модалки */
  title: string;
  /** Содержимое модалки (может быть любым React компонентом) */
  children: ReactNode;
  /** Текст кнопки подтверждения */
  confirmText?: string;
  /** Текст кнопки отмены */
  cancelText?: string;
  /** Вариант кнопки подтверждения */
  confirmVariant?: 'primary' | 'danger' | 'warning' | 'success';
  /** Состояние загрузки */
  isLoading?: boolean;
  /** Callback при подтверждении */
  onConfirm: () => void;
  /** Callback при отмене/закрытии */
  onCancel: () => void;
}
