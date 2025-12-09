import type { FC } from 'react';
import { Button } from '@/components/common/Button';
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
    <Button
      className={styles.generateButton}
      onClick={onClick}
      title="Generate slug from title"
      variant="link"
      size="lg"
    >
      Generate
    </Button>
  );
};
