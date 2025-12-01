import type { FC, FormEvent } from 'react';
import styles from './BookListTable.module.scss';

interface BookListSearchProps {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSearch: (e: FormEvent) => void;
  onClear: () => void;
  hasActiveSearch: boolean;
}

export const BookListSearch: FC<BookListSearchProps> = (props) => {
  const { searchValue, onSearchValueChange, onSearch, onClear, hasActiveSearch } = props;

  return (
    <form onSubmit={onSearch} className={styles.searchForm}>
      <input
        type="text"
        placeholder="Search books..."
        value={searchValue}
        onChange={(e) => onSearchValueChange(e.target.value)}
        className={styles.searchInput}
      />
      <button type="submit" className={styles.searchButton}>
        Search
      </button>
      {hasActiveSearch && (
        <button type="button" onClick={onClear} className={styles.clearButton}>
          Clear
        </button>
      )}
    </form>
  );
};
