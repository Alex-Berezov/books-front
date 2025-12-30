import type { FC } from 'react';
import classNames from 'classnames';
import styles from './Spinner.module.scss';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'white';
}

/**
 * Spinner loading component
 * Used to indicate loading state
 */
export const Spinner: FC<SpinnerProps> = (props) => {
  const { className, size = 'md', variant = 'primary' } = props;

  return (
    <div
      className={classNames(styles.spinner, styles[size], styles[variant], className)}
      role="status"
      aria-label="Loading"
    />
  );
};
