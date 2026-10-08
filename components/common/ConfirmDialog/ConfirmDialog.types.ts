import type { ReactNode } from 'react';

/**
 * Окно подтверждения действия на публичных страницах, без antd (`LEGACY-442`).
 *
 * Админка пользуется своим `Modal.confirm` antd — из `components/admin/**` сюда
 * ничего не импортируется.
 */
export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  /** Текст вопроса. Рисуется в блоке, поэтому допустима и разметка. */
  content: ReactNode;
  confirmText: string;
  cancelText: string;
  /** Идёт действие: кнопка подтверждения крутит индикатор, закрыть окно нельзя. */
  loading?: boolean;
  /**
   * Опасное действие (удаление): кнопка подтверждения с красной обводкой,
   * как кнопка antd с `danger`. Без него — обычная основная кнопка.
   * @default false
   */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
