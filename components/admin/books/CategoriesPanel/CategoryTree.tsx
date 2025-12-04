import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import type { CategoryTree as CategoryTreeType } from '@/types/api-schema';
import styles from './CategoriesPanel.module.scss';

interface CategoryTreeProps {
  categories: CategoryTreeType[];
  expandedCategories: Set<string>;
  isPending: boolean;
  isCategorySelected: (id: string) => boolean;
  onToggleExpand: (id: string) => void;
  onToggleCategory: (id: string) => void;
}

export const CategoryTree: FC<CategoryTreeProps> = ({
  categories,
  expandedCategories,
  isPending,
  isCategorySelected,
  onToggleExpand,
  onToggleCategory,
}) => {
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
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => onToggleExpand(category.id)}
                  ariaLabel={isExpanded ? 'Collapse' : 'Expand'}
                >
                  ▶
                </Button>
              )}
              {!hasChildren && <div className={styles.expandPlaceholder} />}

              <div className={styles.categoryLabel}>
                <Checkbox
                  checked={isSelected}
                  disabled={isPending}
                  onChange={() => onToggleCategory(category.id)}
                  size="sm"
                  label={
                    <>
                      <span className={styles.categoryName}>{category.name}</span>
                      {category.type && (
                        <span className={styles.categoryType}>({category.type})</span>
                      )}
                    </>
                  }
                />
              </div>
            </div>

            {hasChildren && isExpanded && (
              <CategoryTree
                categories={category.children}
                expandedCategories={expandedCategories}
                isCategorySelected={isCategorySelected}
                isPending={isPending}
                onToggleCategory={onToggleCategory}
                onToggleExpand={onToggleExpand}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
};
