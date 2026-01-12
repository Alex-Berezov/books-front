import type { FC, KeyboardEvent } from 'react';
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

interface TagItemProps {
  tag: Tag;
  isSelected: boolean;
  isPending: boolean;
  onToggle: (id: string) => void;
}

const TagItem: FC<TagItemProps> = ({ tag, isSelected, isPending, onToggle }) => {
  const handleClick = () => {
    if (!isPending) {
      onToggle(tag.id);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isPending) {
        onToggle(tag.id);
      }
    }
  };

  return (
    <div
      className={`${styles.tagButton} ${isSelected ? styles.selected : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <span>{tag.name}</span>
      {isSelected && <span className={styles.checkmark}>✓</span>}
    </div>
  );
};

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
          {tags.map((tag) => (
            <TagItem
              key={tag.id}
              tag={tag}
              isSelected={isTagSelected(tag.id)}
              isPending={isPending}
              onToggle={onTagToggle}
            />
          ))}
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
