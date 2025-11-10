import type { FC } from 'react';
import type { StatusIconProps } from '../SlugInput.types';
import styles from '../SlugInput.module.scss';

/**
 * Иконка статуса валидации slug
 *
 * Показывает разные иконки в зависимости от статуса проверки
 */
export const StatusIcon: FC<StatusIconProps> = (props) => {
  const { status } = props;

  if (status === 'idle') {
    return null;
  }

  return (
    <div className={styles.statusIcon}>
      {status === 'checking' && <span className={styles.spinner}>⏳</span>}
      {status === 'valid' && <span className={styles.checkmark}>✓</span>}
      {status === 'invalid' && <span className={styles.cross}>✗</span>}
    </div>
  );
};
