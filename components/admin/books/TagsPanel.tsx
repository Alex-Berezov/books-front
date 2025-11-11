'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { useAttachTag, useDetachTag, useTags } from '@/api/hooks';
import type { Tag } from '@/types/api-schema';
import styles from './TagsPanel.module.scss';

export interface TagsPanelProps {
  /** Book version ID */
  versionId: string;
  /** Current attached tags */
  selectedTags: Tag[];
  /** Callback on tags change */
  onTagsChange?: () => void;
}

/**
 * Book version tags management panel
 *
 * Allows searching for tags and adding/removing them from book version
 */
export const TagsPanel: FC<TagsPanelProps> = (props) => {
  const { versionId, selectedTags, onTagsChange } = props;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Load tags with search
  const { data: tagsData, isLoading } = useTags(
    {
      page: 1,
      limit: 50,
      search: searchQuery || undefined,
    },
    {
      enabled: searchQuery.length > 0,
    }
  );

  // Mutations for attach/detach
  const attachMutation = useAttachTag({
    onSuccess: () => {
      onTagsChange?.();
    },
    onError: (error) => {
      console.error('Failed to attach tag:', error);
      // TODO: Show error toast
    },
  });

  const detachMutation = useDetachTag({
    onSuccess: () => {
      onTagsChange?.();
    },
    onError: (error) => {
      console.error('Failed to detach tag:', error);
      // TODO: Show error toast
    },
  });

  const isPending = attachMutation.isPending || detachMutation.isPending;

  /**
   * Check if tag is selected
   */
  const isTagSelected = (tagId: string): boolean => {
    return selectedTags.some((tag) => tag.id === tagId);
  };

  /**
   * Tag selection handler
   */
  const handleTagToggle = (tagId: string) => {
    if (isPending) {
      return;
    }

    if (isTagSelected(tagId)) {
      // Detach tag
      detachMutation.mutate({ versionId, tagId });
    } else {
      // Attach tag
      attachMutation.mutate({ versionId, tagId });
    }
  };

  /**
   * Remove tag from selected handler
   */
  const handleRemoveTag = (tagId: string) => {
    if (isPending) {
      return;
    }
    detachMutation.mutate({ versionId, tagId });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Tags</h3>
        {selectedTags.length > 0 && (
          <span className={styles.counter}>{selectedTags.length} selected</span>
        )}
      </div>

      {/* Tag search field */}
      <div className={styles.searchContainer}>
        <input
          className={styles.searchInput}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tags..."
          type="text"
          value={searchQuery}
        />
      </div>

      {/* Search results */}
      {searchQuery.length > 0 && (
        <div className={styles.searchResults}>
          {isLoading && (
            <div className={styles.loading}>
              <p>Searching...</p>
            </div>
          )}

          {!isLoading && tagsData && tagsData.data.length > 0 && (
            <div className={styles.resultsList}>
              {tagsData.data.map((tag) => {
                const isSelected = isTagSelected(tag.id);

                return (
                  <button
                    className={`${styles.tagButton} ${isSelected ? styles.selected : ''}`}
                    disabled={isPending}
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    type="button"
                  >
                    <span>{tag.name}</span>
                    {isSelected && <span className={styles.checkmark}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {!isLoading && tagsData && tagsData.data.length === 0 && (
            <div className={styles.empty}>
              <p>No tags found for &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      )}

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className={styles.selectedSection}>
          <h4 className={styles.selectedTitle}>Selected Tags:</h4>
          <div className={styles.selectedList}>
            {selectedTags.map((tag) => (
              <div className={styles.selectedTag} key={tag.id}>
                <span>{tag.name}</span>
                <button
                  className={styles.removeButton}
                  disabled={isPending}
                  onClick={() => handleRemoveTag(tag.id)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      {searchQuery.length === 0 && selectedTags.length === 0 && (
        <div className={styles.hint}>
          <p>Start typing to search and add tags to this book version.</p>
        </div>
      )}
    </div>
  );
};
