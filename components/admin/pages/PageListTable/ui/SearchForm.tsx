import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import type { SearchFormProps } from '../PageListTable.types';
import styles from '../PageListTable.module.scss';

/**
 * Форма поиска страниц
 *
 * Включает поле ввода, кнопку поиска и кнопку очистки
 */
export const SearchForm: FC<SearchFormProps> = (props) => {
  const { searchValue, search, onSearchValueChange, onSearch, onClearSearch } = props;

  return (
    <form onSubmit={onSearch} className={styles.searchForm}>
      <input
        type="text"
        placeholder="Search by title or slug..."
        value={searchValue}
        onChange={(e) => onSearchValueChange(e.target.value)}
        className={styles.searchInput}
      />
      <Button type="submit">Search</Button>
      {search && (
        <Button variant="ghost" onClick={onClearSearch} ariaLabel="Clear search">
          ✕
        </Button>
      )}
    </form>
  );
};
