'use client';

import type { FC, ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './ReaderView.module.scss';

interface ReaderDrawerProps {
  /** DOM id the header button points `aria-controls` at. */
  id: string;
  title: string;
  side: 'left' | 'right';
  onClose: () => void;
  children: ReactNode;
}

/**
 * The reader's side drawer: dimmed backdrop, panel, title and close button.
 * Closes on a click on the backdrop and on Escape. One shell for the table of
 * contents and the settings, so both always close the same way.
 */
export const ReaderDrawer: FC<ReaderDrawerProps> = (props) => {
  const { id, title, side, onClose, children } = props;
  const { t } = useTranslation();

  return (
    <div
      className={styles.drawerOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className={`${styles.drawerPanel} ${side === 'left' ? styles.drawerLeft : styles.drawerRight}`}
        role="dialog"
        aria-label={title}
        id={id}
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            className={styles.drawerClose}
            aria-label={t('a11y.close')}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
