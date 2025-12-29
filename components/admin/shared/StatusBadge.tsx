import type { FC } from 'react';
import styles from './StatusBadge.module.scss';

export type StatusType = 'published' | 'draft' | 'archived' | 'active' | 'inactive' | 'hidden' | 'visible' | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  label?: string;
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, className, label }) => {
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
      case 'active':
      case 'visible':
        return styles.success;
      case 'draft':
      case 'inactive':
      case 'hidden':
        return styles.warning;
      case 'archived':
      case 'deleted':
        return styles.error;
      default:
        return styles.default;
    }
  };

  return (
    <span className={`${styles.badge} ${getStatusClass(status)} ${className || ''}`}>
      {label || status}
    </span>
  );
};
