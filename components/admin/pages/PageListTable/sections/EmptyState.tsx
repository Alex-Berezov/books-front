import type { FC } from 'react';
import Link from 'next/link';
import type { EmptyStateProps } from '../PageListTable.types';
import styles from '../PageListTable.module.scss';

/**
 * Состояние пустого списка страниц
 */
export const EmptyState: FC<EmptyStateProps> = (props) => {
  const { lang, search } = props;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pages Management</h1>
        <Link href={`/admin/${lang}/pages/new`} className={styles.createButton}>
          + Create Page
        </Link>
      </div>
      <div className={styles.empty}>
        <p>No pages found</p>
        {search && <p className={styles.emptyHint}>Try a different search term</p>}
      </div>
    </div>
  );
};
