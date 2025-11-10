import type { FC, ReactNode } from 'react';
import styles from '../PageForm.module.scss';

export interface FormFieldProps {
  /** Уникальный ID для label/input связи */
  id: string;
  /** Текст label */
  label: string;
  /** Контент поля (input, textarea, select и т.д.) */
  children: ReactNode;
  /** Сообщение об ошибке */
  error?: string;
  /** Подсказка под полем */
  hint?: string;
  /** Дополнительный контент в футере (например, счётчик символов) */
  footer?: ReactNode;
  /** Обязательное поле - добавляет звёздочку */
  required?: boolean;
}

/**
 * Переиспользуемый wrapper для полей формы
 *
 * Предоставляет единообразную структуру:
 * - Label с опциональной звёздочкой
 * - Контент поля
 * - Ошибка валидации
 * - Подсказка
 * - Футер (например, счётчик символов)
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
