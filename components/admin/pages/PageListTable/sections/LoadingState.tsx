import type { FC } from 'react';
import Link from 'next/link';
import type { LoadingStateProps } from '../PageListTable.types';
import styles from '../PageListTable.module.scss';

/**
 * Состояние загрузки списка страниц
 */
export const LoadingState: FC<LoadingStateProps> = (props) => {
  const { lang } = props;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pages Management</h1>
        <Link href={`/admin/${lang}/pages/new`} className={styles.createButton}>
          + Create Page
        </Link>
      </div>
      <div className={styles.loading}>Loading pages...</div>
    </div>
  );
};
