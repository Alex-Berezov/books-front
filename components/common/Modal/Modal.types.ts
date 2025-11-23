import type { ReactNode } from 'react';

/**
 * Props for Modal component
 */
export interface ModalProps {
  /** Whether to show modal */
  isOpen: boolean;
  /** Modal title */
  title: string;
  /** Modal content (can be any React component) */
  children: ReactNode;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm button variant */
  confirmVariant?: 'primary' | 'danger' | 'warning' | 'success';
  /** Loading state */
  isLoading?: boolean;
  /** Whether confirm button is disabled */
  isConfirmDisabled?: boolean;
  /** Callback on confirm */
  onConfirm: () => void;
  /** Callback on cancel/close */
  onCancel: () => void;
}
