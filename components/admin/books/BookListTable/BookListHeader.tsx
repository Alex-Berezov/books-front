import type { FC } from 'react';
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
      </div>
      <button className={styles.createButton} type="button" onClick={onAddClick}>
        + Add New Book
      </button>
    </div>
  );
};
