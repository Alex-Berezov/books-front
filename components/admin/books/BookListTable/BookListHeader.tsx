import type { FC } from 'react';
import Link from 'next/link';
import { Button } from '@/components/common/Button';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './BookListTable.module.scss';

interface BookListHeaderProps {
  lang: SupportedLang;
  onAddClick: () => void;
}

export const BookListHeader: FC<BookListHeaderProps> = (props) => {
  const { lang, onAddClick } = props;

  return (
    <div className={styles.titleRow}>
      <div>
        <h1 className={styles.title}>Books</h1>
        <p className={styles.subtitle}>Manage your book content in {lang.toUpperCase()}</p>
        <p className={styles.hint}>
          New books should start with a{' '}
          <Link href={`/admin/${lang}/rights-intakes`}>Rights Intake</Link>.
        </p>
      </div>
      <div className={styles.headerActions}>
        <Link href={`/admin/${lang}/rights-intakes/new`}>
          <Button variant="secondary" size="lg">
            Start Rights Intake
          </Button>
        </Link>
        <Button size="lg" onClick={onAddClick}>
          + Add New Book
        </Button>
      </div>
    </div>
  );
};
