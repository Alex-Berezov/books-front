import type { FC, MouseEvent } from 'react';
import { Globe } from 'lucide-react';
import styles from './ActionButtons.module.scss';

interface TranslationsButtonProps {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  className?: string;
}

export const TranslationsButton: FC<TranslationsButtonProps> = (props) => {
  const { onClick, title = 'Manage translations', className = '' } = props;

  return (
    <button
      type="button"
      className={`${styles.actionButton} ${className}`}
      onClick={onClick}
      title={title}
    >
      <Globe size={16} />
    </button>
  );
};
