import type { FC } from 'react';
import type { Category } from '@/types/api-schema';
import styles from './CategoriesPanel.module.scss';

interface SelectedCategoriesListProps {
  selectedCategories: Category[];
  isPending: boolean;
  onRemove: (categoryId: string) => void;
}

export const SelectedCategoriesList: FC<SelectedCategoriesListProps> = ({
  selectedCategories,
  isPending,
  onRemove,
}) => {
  if (selectedCategories.length === 0) return null;

  return (
    <div className={styles.selectedSection}>
      <h4 className={styles.selectedTitle}>Selected Categories:</h4>
      <div className={styles.selectedList}>
        {selectedCategories.map((category) => (
          <div className={styles.selectedTag} key={category.id}>
            <span>{category.name}</span>
            <button
              className={styles.removeButton}
              disabled={isPending}
              onClick={() => onRemove(category.id)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
