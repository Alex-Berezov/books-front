'use client';

import { useState, type FC, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { useCategoriesTree, useDeleteCategory } from '@/api/hooks/useCategories';
import { CategoryModal } from '@/components/admin/categories/CategoryModal';
import { DeleteCategoryModal } from '@/components/admin/categories/DeleteCategoryModal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { Category, CategoryTree as CategoryTreeType } from '@/types/api-schema';
import styles from './CategoryTree.module.scss';
import { CategoryTreeNode } from './CategoryTreeNode';

export const CategoryTree: FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { data: treeData, isLoading, isError } = useCategoriesTree();

  // Search state
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [initialParentId, setInitialParentId] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | undefined>(undefined);

  const deleteMutation = useDeleteCategory({
    onSuccess: () => {
      enqueueSnackbar('Category deleted successfully', { variant: 'success' });
      setIsDeleteModalOpen(false);
      setCategoryToDelete(undefined);
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to delete category: ${error.message}`, { variant: 'error' });
      setIsDeleteModalOpen(false);
    },
  });

  // Filter tree based on search term
  const filteredTree = useMemo(() => {
    if (!treeData) return [];
    if (!search.trim()) return treeData;

    const term = search.toLowerCase();

    const filterNodes = (nodes: CategoryTreeType[]): CategoryTreeType[] => {
      return nodes.reduce((acc, node) => {
        const matches =
          node.name.toLowerCase().includes(term) || node.slug.toLowerCase().includes(term);
        const filteredChildren = node.children ? filterNodes(node.children) : [];

        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren,
          });
        }
        return acc;
      }, [] as CategoryTreeType[]);
    };

    return filterNodes(treeData);
  }, [treeData, search]);

  const handleCreateClick = () => {
    setSelectedCategory(undefined);
    setInitialParentId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: CategoryTreeType) => {
    setSelectedCategory(category);
    setInitialParentId(null);
    setIsModalOpen(true);
  };

  const handleDelete = (category: CategoryTreeType) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const handleAddSubcategory = (parent: CategoryTreeType) => {
    setSelectedCategory(undefined);
    setInitialParentId(parent.id);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (categoryToDelete) {
      await deleteMutation.mutateAsync(categoryToDelete.id);
    }
  };

  if (isLoading) {
    return <div className={styles.loadingState}>Loading categories...</div>;
  }

  if (isError) {
    return <div className={styles.emptyState}>Failed to load categories. Please try again.</div>;
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Categories</h1>
        <Button onClick={handleCreateClick} leftIcon={<Plus size={18} />}>
          Add Category
        </Button>
      </div>

      <div className={styles.searchContainer}>
        <Input
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={18} />}
        />
      </div>

      <div className={styles.treeContainer}>
        {!filteredTree || filteredTree.length === 0 ? (
          <div className={styles.emptyState}>
            {search
              ? 'No categories found matching your search.'
              : 'No categories found. Create your first category!'}
          </div>
        ) : (
          filteredTree.map((node) => (
            <CategoryTreeNode
              key={node.id}
              node={node}
              level={0}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddSubcategory={handleAddSubcategory}
              forceExpand={!!search}
            />
          ))
        )}
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={selectedCategory}
        initialParentId={initialParentId}
      />

      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        categoryName={categoryToDelete?.name || ''}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};
