'use client';

import type { FC } from 'react';
import type { TagsPanelProps } from './TagsPanel.types';
import { SelectedTagsList } from './SelectedTagsList';
import styles from './TagsPanel.module.scss';
import { TagsPanelHeader } from './TagsPanelHeader';
import { TagsSearchInput } from './TagsSearchInput';
import { TagsSearchResults } from './TagsSearchResults';
import { useTagsPanel } from './useTagsPanel';

/**
 * Book version tags management panel
 *
 * Allows searching for tags and adding/removing them from book version
 */
export const TagsPanel: FC<TagsPanelProps> = (props) => {
  const {
    searchQuery,
    setSearchQuery,
    tagsData,
    isLoading,
    isPending,
    selectedTags,
    isTagSelected,
    handleTagToggle,
    handleRemoveTag,
  } = useTagsPanel(props);

  const showHint = searchQuery.length === 0 && selectedTags.length === 0;

  return (
    <div className={styles.panel}>
      <TagsPanelHeader selectedCount={selectedTags.length} />

      <TagsSearchInput onChange={setSearchQuery} value={searchQuery} />

      <TagsSearchResults
        isLoading={isLoading}
        isPending={isPending}
        isTagSelected={isTagSelected}
        onTagToggle={handleTagToggle}
        searchQuery={searchQuery}
        tags={tagsData?.data}
      />

      <SelectedTagsList isPending={isPending} onRemoveTag={handleRemoveTag} tags={selectedTags} />

      {showHint && (
        <div className={styles.hint}>
          <p>Start typing to search and add tags to this book version.</p>
        </div>
      )}
    </div>
  );
};
