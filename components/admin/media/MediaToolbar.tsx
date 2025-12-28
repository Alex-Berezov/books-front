import type { FC } from 'react';
import { LayoutGrid, List as ListIcon } from 'lucide-react';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import type { MediaType } from '@/types/api-schema/media';
import styles from './MediaPage.module.scss';

interface MediaToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: MediaType | 'all';
  onTypeFilterChange: (value: MediaType | 'all') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export const MediaToolbar: FC<MediaToolbarProps> = (props) => {
  const {
    search,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    viewMode,
    onViewModeChange,
  } = props;

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Videos' },
    { value: 'audio', label: 'Audio' },
    { value: 'document', label: 'Documents' },
  ];

  return (
    <div className={styles.toolbar}>
      <div className={styles.filters}>
        <div className={styles.search}>
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Select
          options={typeOptions}
          value={typeFilter}
          onChange={(value) => onTypeFilterChange(value as MediaType | 'all')}
        />
      </div>

      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleButton} ${viewMode === 'grid' ? styles.active : ''}`}
          onClick={() => onViewModeChange('grid')}
          aria-label="Grid view"
          type="button"
        >
          <LayoutGrid size={20} />
        </button>
        <button
          className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
          onClick={() => onViewModeChange('list')}
          aria-label="List view"
          type="button"
        >
          <ListIcon size={20} />
        </button>
      </div>
    </div>
  );
};
