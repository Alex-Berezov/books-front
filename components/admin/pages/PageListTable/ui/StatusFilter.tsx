import type { FC } from 'react';
import type { StatusFilterProps } from '../PageListTable.types';
import type { PublicationStatus } from '@/types/api-schema';
import styles from '../PageListTable.module.scss';

/**
 * Фильтр по статусу публикации
 *
 * Позволяет отфильтровать страницы по статусу: все, черновики, опубликованные, архивные
 */
export const StatusFilter: FC<StatusFilterProps> = (props) => {
  const { statusFilter, onStatusFilterChange } = props;

  const filters: Array<{ value: PublicationStatus | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className={styles.filters}>
      <label className={styles.filterLabel}>Status:</label>
      <div className={styles.filterButtons}>
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onStatusFilterChange(filter.value)}
            className={`${styles.filterButton} ${statusFilter === filter.value ? styles.active : ''}`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
};
