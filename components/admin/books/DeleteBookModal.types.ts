/**
 * Props for DeleteBookModal component
 */
export interface DeleteBookModalProps {
  /** Whether to show modal */
  isOpen: boolean;
  /** Book title to display in confirmation */
  bookTitle: string;
  /** Loading state while deletion is in progress */
  isDeleting?: boolean;
  /** Callback when user confirms deletion */
  onConfirm: () => void;
  /** Callback when user cancels deletion */
  onCancel: () => void;
}
