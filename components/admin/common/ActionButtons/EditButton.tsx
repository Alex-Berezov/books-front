import type { FC, MouseEvent } from 'react';
import { Edit } from 'lucide-react';
import Link from 'next/link';
import styles from './ActionButtons.module.scss';

interface EditButtonProps {
  href?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  className?: string;
}

export const EditButton: FC<EditButtonProps> = (props) => {
  const { href, onClick, title = 'Edit', className = '' } = props;

  if (href) {
    return (
      <Link href={href} className={`${styles.actionButton} ${className}`} title={title}>
        <Edit size={16} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.actionButton} ${className}`}
      title={title}
    >
      <Edit size={16} />
    </button>
  );
};
