/**
 * Types for CreateBookModal component
 */

import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Props for CreateBookModal component
 */
export interface CreateBookModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Current language */
  lang: SupportedLang;
}

/**
 * Form data for creating a book
 */
export interface CreateBookFormData {
  /** Book title */
  title: string;
  /** Book author */
  author: string;
}
