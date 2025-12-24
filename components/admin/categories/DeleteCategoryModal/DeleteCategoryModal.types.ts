/**
 * Props for DeleteCategoryModal component
 */
export interface DeleteCategoryModalProps {
  /** Whether to show modal */
  isOpen: boolean;
  /** Category name to display in confirmation */
  categoryName: string;
  /** Loading state while deletion is in progress */
  isDeleting?: boolean;
  /** Callback when user confirms deletion */
  onConfirm: () => void;
  /** Callback when user cancels deletion */
  onCancel: () => void;
}
