import type { FC, ReactNode } from 'react';
import styles from '../PageForm.module.scss';

export interface FormFieldProps {
  /** Unique ID for label/input binding */
  id: string;
  /** Label text */
  label: string;
  /** Field content (input, textarea, select, etc.) */
  children: ReactNode;
  /** Error message */
  error?: string;
  /** Hint below the field */
  hint?: string;
  /** Additional footer content (e.g., character counter) */
  footer?: ReactNode;
  /** Required field - adds asterisk */
  required?: boolean;
}

/**
 * Reusable wrapper for form fields
 *
 * Provides uniform structure:
 * - Label with optional asterisk
 * - Field content
 * - Validation error
 * - Hint
 * - Footer (e.g., character counter)
 */
export const FormField: FC<FormFieldProps> = (props) => {
  const { id, label, children, error, hint, footer, required = false } = props;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label} {required && '*'}
      </label>
      {children}
      {error && <span className={styles.error}>{error}</span>}
      {(hint || footer) && (
        <div className={styles.fieldFooter}>
          {hint && <span className={styles.hint}>{hint}</span>}
          {footer}
        </div>
      )}
    </div>
  );
};
