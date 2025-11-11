import type { FC } from 'react';
import type { GenerateButtonProps } from '../SlugInput.types';
import styles from '../SlugInput.module.scss';

/**
 * Button for generating slug from sourceValue
 *
 * Shown only if sourceValue exists
 */
export const GenerateButton: FC<GenerateButtonProps> = (props) => {
  const { hasSourceValue, onClick } = props;

  if (!hasSourceValue) {
    return null;
  }

  return (
    <button
      className={styles.generateButton}
      onClick={onClick}
      title="Generate slug from title"
      type="button"
    >
      Generate
    </button>
  );
};
