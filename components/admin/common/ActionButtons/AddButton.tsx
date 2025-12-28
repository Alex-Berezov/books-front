import type { FC, MouseEvent } from 'react';
import { Plus } from 'lucide-react';
import styles from './ActionButtons.module.scss';

interface AddButtonProps {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  className?: string;
}

export const AddButton: FC<AddButtonProps> = (props) => {
  const { onClick, title = 'Add', className = '' } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.actionButton} ${className}`}
      title={title}
    >
      <Plus size={16} />
    </button>
  );
};
