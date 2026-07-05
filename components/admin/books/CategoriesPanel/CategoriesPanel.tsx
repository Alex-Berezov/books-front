'use client';

import { useState, useMemo, type FC } from 'react';
import { Network, BookOpen, FolderArchive } from 'lucide-react';
import { Input } from '@/components/common/Input';
import type { CategoriesPanelProps } from './CategoriesPanel.types';
import type { CategoryTree as CategoryTreeType, CategoryType } from '@/types/api-schema';
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

const PANEL_CONFIG: Record<
  CategoryType,
  { icon: FC<{ size?: number; className?: string }>; title: string; placeholder: string }
> = {
  category: { icon: Network, title: 'Categories', placeholder: 'Search categories...' },
  genre: { icon: BookOpen, title: 'Genres', placeholder: 'Search genres...' },
  collection: { icon: FolderArchive, title: 'Collections', placeholder: 'Search collections...' },
};

/**
 * Book version taxonomy management panel
 *
 * Supports categories, genres, and collections based on `type` prop.
 * Allows viewing tree, selecting and deselecting items.
 */
export const CategoriesPanel: FC<CategoriesPanelProps> = (props) => {
  const { type = 'category' } = props;
  const [searchQuery, setSearchQuery] = useState('');
  const {
    categoriesTree,
    isLoading,
    expandedCategories,
    isPending,
    isCategorySelected,
    toggleExpand,
    handleCategoryToggle,
    filteredSelectedCategories,
  } = useCategoriesPanel(props);

  const config = PANEL_CONFIG[type];
  const Icon = config.icon;

  const filteredTree = useMemo(
    () => (categoriesTree ? filterCategoriesTree(categoriesTree, searchQuery) : []),
    [categoriesTree, searchQuery]
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Icon className={styles.icon} size={20} />
          <h3 className={styles.title}>{config.title}</h3>
        </div>
        {filteredSelectedCategories.length > 0 && (
          <span className={styles.counter}>{filteredSelectedCategories.length} selected</span>
        )}
      </div>

      {/* Search Input */}
      {!isLoading && categoriesTree && (
        <div className={styles.searchWrapper}>
          <Input
            placeholder={config.placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
          />
        </div>
      )}

      {isLoading && (
        <div className={styles.loading}>
          <p>Loading {config.title.toLowerCase()}...</p>
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
          <p>No {config.title.toLowerCase()} available</p>
        </div>
      )}

      <SelectedCategoriesList
        isPending={isPending}
        onRemove={handleCategoryToggle}
        selectedCategories={filteredSelectedCategories}
      />
    </div>
  );
};
