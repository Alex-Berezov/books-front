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
  /**
   * Restricts the type filter to these types, dropping "All Types" with it.
   * Used when the caller can only accept some kinds of media - picking an
   * image for an article, say - so the filter cannot offer what the caller
   * would have to reject afterwards.
   */
  availableTypes?: MediaType[];
}

const TYPE_LABELS: Record<MediaType, string> = {
  image: 'Images',
  video: 'Videos',
  audio: 'Audio',
  document: 'Documents',
};

const ALL_TYPES: MediaType[] = ['image', 'video', 'audio', 'document'];

export const MediaToolbar: FC<MediaToolbarProps> = (props) => {
  const {
    search,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    viewMode,
    onViewModeChange,
    availableTypes,
  } = props;

  const restricted = availableTypes !== undefined && availableTypes.length > 0;
  const listedTypes = restricted ? availableTypes : ALL_TYPES;

  // "All Types" is dropped only when a single type is permitted - then it would
  // promise more than the caller accepts. With several it stays and means "all
  // permitted", and without it the Select would hold a value outside its own
  // list and render blank.
  const showAllOption = listedTypes.length > 1;

  const typeOptions = [
    ...(showAllOption ? [{ value: 'all', label: 'All Types' }] : []),
    ...listedTypes.map((type) => ({ value: type, label: TYPE_LABELS[type] })),
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
