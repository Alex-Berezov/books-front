import type { FC } from 'react';
import type { PaginationControlsProps } from '../PageListTable.types';
import styles from '../PageListTable.module.scss';

/**
 * Элементы управления пагинацией
 *
 * Показывает текущую страницу, общее количество страниц и кнопки навигации
 */
export const PaginationControls: FC<PaginationControlsProps> = (props) => {
  const { currentPage, totalPages, totalItems, onPrevious, onNext, showItemsCount = false } = props;

  return (
    <div className={styles.pagination}>
      <button onClick={onPrevious} disabled={currentPage === 1} className={styles.paginationButton}>
        ← Previous
      </button>
      <span className={styles.paginationInfo}>
        Page {currentPage} of {totalPages}
        {showItemsCount && totalItems !== undefined && ` (${totalItems} total pages)`}
      </span>
      <button
        onClick={onNext}
        disabled={currentPage >= totalPages}
        className={styles.paginationButton}
      >
        Next →
      </button>
    </div>
  );
};
