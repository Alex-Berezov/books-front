import type { FC, ReactNode } from 'react';
import styles from './EmptyState.module.scss';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = (props) => {
  const { title, description, icon, action, className } = props;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
