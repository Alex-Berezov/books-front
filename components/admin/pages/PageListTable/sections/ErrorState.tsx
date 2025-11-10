import type { FC } from 'react';
import Link from 'next/link';
import type { ErrorStateProps } from '../PageListTable.types';
import styles from '../PageListTable.module.scss';

/**
 * Состояние ошибки при загрузке списка страниц
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
        <p>API endpoint not available yet</p>
        <p className={styles.errorMessage}>
          The /pages endpoint is not implemented on the backend yet. You can still create new pages
          using the button above.
        </p>
        <p className={styles.errorMessage}>Error: {errorMessage}</p>
      </div>
    </div>
  );
};
