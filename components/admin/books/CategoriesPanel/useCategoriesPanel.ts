import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useAttachCategory, useCategoriesTree, useDetachCategory } from '@/api/hooks';
import type { CategoriesPanelProps } from './CategoriesPanel.types';

export const useCategoriesPanel = (props: CategoriesPanelProps) => {
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

  return {
    categoriesTree,
    isLoading,
    expandedCategories,
    isPending,
    isCategorySelected,
    toggleExpand,
    handleCategoryToggle,
  };
};
