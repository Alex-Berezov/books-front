import type { FC } from 'react';
import Link from 'next/link';
import type { ErrorStateProps } from '../PageListTable.types';
import styles from '../PageListTable.module.scss';

/**
 * Error state when loading the list of pages
 */
export const ErrorState: FC<ErrorStateProps> = (props) => {
  const { lang, errorMessage } = props;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pages Management</h1>
        <Link href={`/admin/${lang}/pages/new`} className={styles.createButton}>
          + Create Page
        </Link>
      </div>
      <div className={styles.error}>
        <p className={styles.errorMessage}>Failed to load pages</p>
        <p className={styles.errorMessage}>Error: {errorMessage}</p>
      </div>
    </div>
  );
};
