'use client';

import type { FC, ReactNode } from 'react';
import styles from './Toolbar.module.scss';

export interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}

/**
 * Single toolbar control. Extracted from `Toolbar` so the image button, which
 * owns modal state of its own, can render the same chrome.
 */
export const ToolbarButton: FC<ToolbarButtonProps> = (props) => {
  const { onClick, isActive = false, disabled = false, title, children } = props;

  const className = isActive ? `${styles.button} ${styles.buttonActive}` : styles.button;

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
    >
      {children}
    </button>
  );
};
