'use client';

import type { FC } from 'react';
import { Network } from 'lucide-react';
import type { CategoriesPanelProps } from './CategoriesPanel.types';
import styles from './CategoriesPanel.module.scss';
import { CategoryTree } from './CategoryTree';
import { SelectedCategoriesList } from './SelectedCategoriesList';
import { useCategoriesPanel } from './useCategoriesPanel';

/**
 * Book version categories management panel
 *
 * Allows viewing category tree, selecting and deselecting categories
 */
export const CategoriesPanel: FC<CategoriesPanelProps> = (props) => {
  const { selectedCategories } = props;
  const {
    categoriesTree,
    isLoading,
    expandedCategories,
    isPending,
    isCategorySelected,
    toggleExpand,
    handleCategoryToggle,
  } = useCategoriesPanel(props);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Network className={styles.icon} size={20} />
          <h3 className={styles.title}>Categories</h3>
        </div>
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
        <div className={styles.treeContainer}>
          <CategoryTree
            categories={categoriesTree}
            expandedCategories={expandedCategories}
            isCategorySelected={isCategorySelected}
            isPending={isPending}
            onToggleCategory={handleCategoryToggle}
            onToggleExpand={toggleExpand}
          />
        </div>
      )}

      {!isLoading && !categoriesTree && (
        <div className={styles.empty}>
          <p>No categories available</p>
        </div>
      )}

      <SelectedCategoriesList
        isPending={isPending}
        onRemove={handleCategoryToggle}
        selectedCategories={selectedCategories}
      />
    </div>
  );
};
