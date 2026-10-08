import type { FC } from 'react';
import type { ValidationHintProps } from '../SlugInput.types';
import styles from '../SlugInput.module.scss';

/**
 * Slug format hint
 *
 * Shown when there are no validation errors
 */
export const ValidationHint: FC<ValidationHintProps> = (props) => {
  const { placeholder } = props;

  return (
    <span className={styles.hint}>
      URL-friendly identifier (lowercase, hyphens only). Example: {placeholder}
    </span>
  );
};
