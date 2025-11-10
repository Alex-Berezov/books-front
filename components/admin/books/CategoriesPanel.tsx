'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { useAttachCategory, useCategoriesTree, useDetachCategory } from '@/api/hooks';
import type { Category } from '@/types/api-schema';
import styles from './CategoriesPanel.module.scss';

export interface CategoriesPanelProps {
  /** ID версии книги */
  versionId: string;
  /** Текущие привязанные категории */
  selectedCategories: Category[];
  /** Callback при изменении категорий */
  onCategoriesChange?: () => void;
}

/**
 * Панель управления категориями версии книги
 *
 * Позволяет просматривать дерево категорий, выбирать и отменять выбор категорий
 */
export const CategoriesPanel: FC<CategoriesPanelProps> = (props) => {
  const { versionId, selectedCategories, onCategoriesChange } = props;

  // Состояние раскрытых категорий в дереве
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Загрузка дерева категорий
  const { data: categoriesTree, isLoading } = useCategoriesTree();

  // Мутации для attach/detach
  const attachMutation = useAttachCategory({
    onSuccess: () => {
      onCategoriesChange?.();
    },
    onError: (error) => {
      console.error('Failed to attach category:', error);
      // TODO: Показать toast с ошибкой
    },
  });

  const detachMutation = useDetachCategory({
    onSuccess: () => {
      onCategoriesChange?.();
    },
    onError: (error) => {
      console.error('Failed to detach category:', error);
      // TODO: Показать toast с ошибкой
    },
  });

  const isPending = attachMutation.isPending || detachMutation.isPending;

  /**
   * Проверка, выбрана ли категория
   */
  const isCategorySelected = (categoryId: string): boolean => {
    return selectedCategories.some((cat) => cat.id === categoryId);
  };

  /**
   * Переключить раскрытие категории
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
   * Обработчик выбора категории
   */
  const handleCategoryToggle = (categoryId: string) => {
    if (isPending) {
      return;
    }

    if (isCategorySelected(categoryId)) {
      // Отвязать категорию
      detachMutation.mutate({ versionId, categoryId });
    } else {
      // Привязать категорию
      attachMutation.mutate({ versionId, categoryId });
    }
  };

  /**
   * Рекурсивная отрисовка дерева категорий
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
