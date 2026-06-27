'use client';

import { useState, type FC } from 'react';
import { Network } from 'lucide-react';
import { Input } from '@/components/common/Input';
import type { CategoriesPanelProps } from './CategoriesPanel.types';
import type { CategoryTree as CategoryTreeType } from '@/types/api-schema';
import styles from './CategoriesPanel.module.scss';
import { CategoryTree } from './CategoryTree';
import { SelectedCategoriesList } from './SelectedCategoriesList';
import { useCategoriesPanel } from './useCategoriesPanel';

function filterCategoriesTree(tree: CategoryTreeType[], query: string): CategoryTreeType[] {
  if (!query) return tree;
  const lowerQuery = query.toLowerCase();
  return tree
    .map((node) => {
      const filteredChildren = node.children ? filterCategoriesTree(node.children, query) : [];
      const isMatch =
        node.name.toLowerCase().includes(lowerQuery) ||
        (node.type && node.type.toLowerCase().includes(lowerQuery));
      if (isMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    })
    .filter((node): node is CategoryTreeType => node !== null);
}

/**
 * Book version categories management panel
 *
 * Allows viewing category tree, selecting and deselecting categories
 */
export const CategoriesPanel: FC<CategoriesPanelProps> = (props) => {
  const { selectedCategories } = props;
  const [searchQuery, setSearchQuery] = useState('');
  const {
    categoriesTree,
    isLoading,
    expandedCategories,
    isPending,
    isCategorySelected,
    toggleExpand,
    handleCategoryToggle,
  } = useCategoriesPanel(props);

  const filteredTree = categoriesTree ? filterCategoriesTree(categoriesTree, searchQuery) : [];

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

      {/* Search Input */}
      {!isLoading && categoriesTree && (
        <div className={styles.searchWrapper}>
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
          />
        </div>
      )}

      {isLoading && (
        <div className={styles.loading}>
          <p>Loading categories...</p>
        </div>
      )}

      {!isLoading && categoriesTree && (
        <div className={styles.treeContainer}>
          <CategoryTree
            categories={filteredTree}
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
