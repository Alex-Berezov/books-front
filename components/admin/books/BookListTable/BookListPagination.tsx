import type { FC } from 'react';
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
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className={styles.paginationButton}
      >
        Previous
      </button>

      <span className={styles.paginationInfo}>
        Page {page} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className={styles.paginationButton}
      >
        Next
      </button>
    </div>
  );
};
