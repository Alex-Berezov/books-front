'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { useSnackbar } from 'notistack';
import { useAttachCategory, useCategoriesTree, useDetachCategory } from '@/api/hooks';
import type { Category } from '@/types/api-schema';
import styles from './CategoriesPanel.module.scss';

export interface CategoriesPanelProps {
  /** Book version ID */
  versionId: string;
  /** Current attached categories */
  selectedCategories: Category[];
  /** Callback on categories change */
  onCategoriesChange?: () => void;
}

/**
 * Book version categories management panel
 *
 * Allows viewing category tree, selecting and deselecting categories
 */
export const CategoriesPanel: FC<CategoriesPanelProps> = (props) => {
  const { versionId, selectedCategories, onCategoriesChange } = props;
  const { enqueueSnackbar } = useSnackbar();

  // State of expanded categories in tree
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Load categories tree
  const { data: categoriesTree, isLoading } = useCategoriesTree();

  // Mutations for attach/detach
  const attachMutation = useAttachCategory({
    onSuccess: () => {
      enqueueSnackbar('Category attached successfully', { variant: 'success' });
      onCategoriesChange?.();
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to attach category: ${error.message}`, { variant: 'error' });
    },
  });

  const detachMutation = useDetachCategory({
    onSuccess: () => {
      enqueueSnackbar('Category detached successfully', { variant: 'success' });
      onCategoriesChange?.();
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to detach category: ${error.message}`, { variant: 'error' });
    },
  });

  const isPending = attachMutation.isPending || detachMutation.isPending;

  /**
   * Check if category is selected
   */
  const isCategorySelected = (categoryId: string): boolean => {
    return selectedCategories.some((cat) => cat.id === categoryId);
  };

  /**
   * Toggle category expansion
   */
  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  /**
   * Category selection handler
   */
  const handleCategoryToggle = (categoryId: string) => {
    if (isPending) {
      return;
    }

    if (isCategorySelected(categoryId)) {
      // Detach category
      detachMutation.mutate({ versionId, categoryId });
    } else {
      // Attach category
      attachMutation.mutate({ versionId, categoryId });
    }
  };

  /**
   * Recursive rendering of category tree
   */
  const renderCategoryTree = (categories: typeof categoriesTree) => {
    if (!categories || categories.length === 0) {
      return null;
    }

    return (
      <ul className={styles.categoryList}>
        {categories.map((category) => {
          const isSelected = isCategorySelected(category.id);
          const isExpanded = expandedCategories.has(category.id);
          const hasChildren = category.children && category.children.length > 0;

          return (
            <li className={styles.categoryItem} key={category.id}>
              <div className={styles.categoryRow}>
                {hasChildren && (
                  <button
                    className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
                    onClick={() => toggleExpand(category.id)}
                    type="button"
                  >
                    ▶
                  </button>
                )}
                {!hasChildren && <div className={styles.expandPlaceholder} />}

                <label className={styles.categoryLabel}>
                  <input
                    checked={isSelected}
                    className={styles.checkbox}
                    disabled={isPending}
                    onChange={() => handleCategoryToggle(category.id)}
                    type="checkbox"
                  />
                  <span className={styles.categoryName}>{category.name}</span>
                  {category.type && <span className={styles.categoryType}>({category.type})</span>}
                </label>
              </div>

              {hasChildren && isExpanded && renderCategoryTree(category.children)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Categories</h3>
        {selectedCategories.length > 0 && (
          <span className={styles.counter}>{selectedCategories.length} selected</span>
        )}
      </div>

      {isLoading && (
        <div className={styles.loading}>
          <p>Loading categories...</p>
        </div>
      )}

      {!isLoading && categoriesTree && (
        <div className={styles.treeContainer}>{renderCategoryTree(categoriesTree)}</div>
      )}

      {!isLoading && !categoriesTree && (
        <div className={styles.empty}>
          <p>No categories available</p>
        </div>
      )}

      {selectedCategories.length > 0 && (
        <div className={styles.selectedSection}>
          <h4 className={styles.selectedTitle}>Selected Categories:</h4>
          <div className={styles.selectedList}>
            {selectedCategories.map((category) => (
              <div className={styles.selectedTag} key={category.id}>
                <span>{category.name}</span>
                <button
                  className={styles.removeButton}
                  disabled={isPending}
                  onClick={() => handleCategoryToggle(category.id)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
