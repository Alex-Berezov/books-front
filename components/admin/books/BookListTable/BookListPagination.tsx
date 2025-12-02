import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import styles from './BookListTable.module.scss';

interface BookListPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const BookListPagination: FC<BookListPaginationProps> = (props) => {
  const { page, totalPages, onPageChange } = props;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={styles.pagination}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Previous
      </Button>

      <span className={styles.paginationInfo}>
        Page {page} of {totalPages}
      </span>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        Next
      </Button>
    </div>
  );
};
