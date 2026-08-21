import type { bookVersionBaseSchema } from './bookVersionSchema';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookVersionDetail } from '@/types/api-schema';
import type { z } from 'zod';

/**
 * Form data type
 *
 * Сама схема живёт в `bookVersionSchema.ts`: `vitest.config.ts` исключает `*.types.ts`
 * из покрытия, и проверка, стоящая в таком файле, в отчёт не попадает никогда.
 */
export type BookFormData = z.infer<typeof bookVersionBaseSchema>;

/**
 * Book form component props
 */
export interface BookFormProps {
  /** Current interface language */
  lang: SupportedLang;
  /** Book ID (for creating new version) */
  bookId?: string;
  /** Existing version data (for editing) */
  initialData?: BookVersionDetail;
  /** Initial title (from URL params) */
  initialTitle?: string;
  /** Initial author (from URL params) */
  initialAuthor?: string;
  /** List of languages that already exist for this book */
  existingLanguages?: SupportedLang[];
  /** Callback on successful form submission */
  onSubmit: (data: BookFormData) => void | Promise<void>;
  /** Loading flag (e.g., when submitting to server) */
  isSubmitting?: boolean;
  /** Form ID for external submission */
  id?: string;
}
