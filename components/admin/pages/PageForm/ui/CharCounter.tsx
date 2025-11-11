import type { FC } from 'react';
import styles from '../PageForm.module.scss';

export interface CharCounterProps {
  /** Current character count */
  current: number;
  /** Maximum character count */
  max: number;
}

/**
 * Character counter for fields with length limit
 *
 * Shows "current / max" in the right corner of the field
 */
export const CharCounter: FC<CharCounterProps> = (props) => {
  const { current, max } = props;

  return (
    <span className={styles.charCounter}>
      {current} / {max}
    </span>
  );
};
