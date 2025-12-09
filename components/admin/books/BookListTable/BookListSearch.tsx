import type { FC } from 'react';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import styles from './BookListTable.module.scss';

export type StatusFilter = 'all' | 'published' | 'draft';

const STATUS_OPTIONS = [
  { label: 'All Status', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
];

interface BookListSearchProps {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
}

export const BookListSearch: FC<BookListSearchProps> = (props) => {
  const { searchValue, onSearchValueChange, statusFilter, onStatusFilterChange } = props;

  return (
    <div className={styles.searchForm}>
      <Input
        type="text"
        placeholder="Search books..."
        value={searchValue}
        onChange={(e) => onSearchValueChange(e.target.value)}
        className={styles.searchInput}
      />
      <Select
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={(value) => onStatusFilterChange(value as StatusFilter)}
        className={styles.statusSelect}
      />
    </div>
  );
};
