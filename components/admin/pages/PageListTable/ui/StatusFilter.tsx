import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import type { StatusFilterProps } from '../PageListTable.types';
import type { PublicationStatus } from '@/types/api-schema';
import styles from '../PageListTable.module.scss';

/**
 * Фильтр по статусу публикации
 *
 * Позволяет отфильтровать страницы по статусу: все, черновики, опубликованные
 */
export const StatusFilter: FC<StatusFilterProps> = (props) => {
  const { statusFilter, onStatusFilterChange } = props;

  const filters: Array<{ value: PublicationStatus | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
  ];

  return (
    <div className={styles.filters}>
      <span className={styles.filterLabel} id="page-status-filter-label">
        Status:
      </span>
      <div className={styles.filterButtons} role="group" aria-labelledby="page-status-filter-label">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant="secondary"
            size="sm"
            onClick={() => onStatusFilterChange(filter.value)}
            active={statusFilter === filter.value}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
