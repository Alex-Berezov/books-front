import type { FC, MouseEvent } from 'react';
import { Trash2 } from 'lucide-react';
import styles from './ActionButtons.module.scss';

interface DeleteButtonProps {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  disabled?: boolean;
  className?: string;
}

export const DeleteButton: FC<DeleteButtonProps> = (props) => {
  const { onClick, title = 'Delete', disabled = false, className = '' } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${styles.actionButton} ${styles.delete} ${className}`}
      title={title}
      aria-label={title}
    >
      <Trash2 size={16} />
    </button>
  );
};
