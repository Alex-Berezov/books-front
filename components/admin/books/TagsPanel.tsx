'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { useAttachTag, useDetachTag, useTags } from '@/api/hooks';
import type { Tag } from '@/types/api-schema';
import styles from './TagsPanel.module.scss';

export interface TagsPanelProps {
  /** ID версии книги */
  versionId: string;
  /** Текущие привязанные теги */
  selectedTags: Tag[];
  /** Callback при изменении тегов */
  onTagsChange?: () => void;
}

/**
 * Панель управления тегами версии книги
 *
 * Позволяет искать теги и добавлять/удалять их из версии книги
 */
export const TagsPanel: FC<TagsPanelProps> = (props) => {
  const { versionId, selectedTags, onTagsChange } = props;

  // Состояние поиска
  const [searchQuery, setSearchQuery] = useState('');

  // Загрузка тегов с поиском
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

  // Мутации для attach/detach
  const attachMutation = useAttachTag({
    onSuccess: () => {
      onTagsChange?.();
    },
    onError: (error) => {
      console.error('Failed to attach tag:', error);
      // TODO: Показать toast с ошибкой
    },
  });

  const detachMutation = useDetachTag({
    onSuccess: () => {
      onTagsChange?.();
    },
    onError: (error) => {
      console.error('Failed to detach tag:', error);
      // TODO: Показать toast с ошибкой
    },
  });

  const isPending = attachMutation.isPending || detachMutation.isPending;

  /**
   * Проверка, выбран ли тег
   */
  const isTagSelected = (tagId: string): boolean => {
    return selectedTags.some((tag) => tag.id === tagId);
  };

  /**
   * Обработчик выбора тега
   */
  const handleTagToggle = (tagId: string) => {
    if (isPending) {
      return;
    }

    if (isTagSelected(tagId)) {
      // Отвязать тег
      detachMutation.mutate({ versionId, tagId });
    } else {
      // Привязать тег
      attachMutation.mutate({ versionId, tagId });
    }
  };

  /**
   * Обработчик удаления тега из выбранных
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

      {/* Поле поиска тегов */}
      <div className={styles.searchContainer}>
        <input
          className={styles.searchInput}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tags..."
          type="text"
          value={searchQuery}
        />
      </div>

      {/* Результаты поиска */}
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

      {/* Выбранные теги */}
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

      {/* Подсказка */}
      {searchQuery.length === 0 && selectedTags.length === 0 && (
        <div className={styles.hint}>
          <p>Start typing to search and add tags to this book version.</p>
        </div>
      )}
    </div>
  );
};
