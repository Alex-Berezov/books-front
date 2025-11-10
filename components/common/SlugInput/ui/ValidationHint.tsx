import type { FC } from 'react';
import type { ValidationHintProps } from '../SlugInput.types';
import styles from '../SlugInput.module.scss';

/**
 * Подсказка о формате slug
 *
 * Показывается когда нет ошибок валидации
 */
export const ValidationHint: FC<ValidationHintProps> = (props) => {
  const { placeholder } = props;

  return (
    <span className={styles.hint}>
      URL-friendly identifier (lowercase, hyphens only). Example: {placeholder}
    </span>
  );
};
