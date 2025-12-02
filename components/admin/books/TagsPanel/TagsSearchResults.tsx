import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import type { Tag } from '@/types/api-schema';
import styles from './TagsPanel.module.scss';

interface TagsSearchResultsProps {
  searchQuery: string;
  isLoading: boolean;
  tags: Tag[] | undefined;
  isPending: boolean;
  isTagSelected: (tagId: string) => boolean;
  onTagToggle: (tagId: string) => void;
}

export const TagsSearchResults: FC<TagsSearchResultsProps> = (props) => {
  const { searchQuery, isLoading, tags, isPending, isTagSelected, onTagToggle } = props;

  if (searchQuery.length === 0) {
    return null;
  }

  return (
    <div className={styles.searchResults}>
      {isLoading && (
        <div className={styles.loading}>
          <p>Searching...</p>
        </div>
      )}

      {!isLoading && tags && tags.length > 0 && (
        <div className={styles.resultsList}>
          {tags.map((tag) => {
            const isSelected = isTagSelected(tag.id);

            return (
              <Button
                key={tag.id}
                variant="secondary"
                size="sm"
                className={`${styles.tagButton} ${isSelected ? styles.selected : ''}`}
                disabled={isPending}
                onClick={() => onTagToggle(tag.id)}
                active={isSelected}
              >
                <span>{tag.name}</span>
                {isSelected && <span className={styles.checkmark}>✓</span>}
              </Button>
            );
          })}
        </div>
      )}

      {!isLoading && tags && tags.length === 0 && (
        <div className={styles.empty}>
          <p>No tags found for &quot;{searchQuery}&quot;</p>
        </div>
      )}
    </div>
  );
};
