import type { FC } from 'react';
import { Button } from '@/components/common/Button';
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
      <Button variant="secondary" size="sm" onClick={onPrevious} disabled={currentPage === 1}>
        ← Previous
      </Button>
      <span className={styles.paginationInfo}>
        Page {currentPage} of {totalPages}
        {showItemsCount && totalItems !== undefined && ` (${totalItems} total pages)`}
      </span>
      <Button variant="secondary" size="sm" onClick={onNext} disabled={currentPage >= totalPages}>
        Next →
      </Button>
    </div>
  );
};
