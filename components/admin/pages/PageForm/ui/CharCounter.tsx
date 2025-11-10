import type { FC } from 'react';
import styles from '../PageForm.module.scss';

export interface CharCounterProps {
  /** Текущее количество символов */
  current: number;
  /** Максимальное количество символов */
  max: number;
}

/**
 * Счётчик символов для полей с ограничением длины
 *
 * Показывает "current / max" в правом углу поля
 */
export const CharCounter: FC<CharCounterProps> = (props) => {
  const { current, max } = props;

  return (
    <span className={styles.charCounter}>
      {current} / {max}
    </span>
  );
};
