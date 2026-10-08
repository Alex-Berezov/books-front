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
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Loading state */
  isLoading?: boolean;
  /** Whether confirm button is disabled */
  isConfirmDisabled?: boolean;
  /** Whether to show footer buttons (default: true) */
  showFooter?: boolean;
  /** Close on overlay click (default: true) */
  closeOnOverlayClick?: boolean;
  /** Close on Escape (default: true). A nested dialog still keeps Escape to itself */
  closeOnEscape?: boolean;
  /** Callback on confirm */
  onConfirm?: () => void;
  /** Callback on cancel/close */
  onCancel: () => void;
}
