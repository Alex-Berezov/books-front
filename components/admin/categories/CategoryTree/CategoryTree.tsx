'use client';

import { useState, type FC, useMemo } from 'react';
import { FileJson, Plus, Search } from 'lucide-react';
import { useSnackbar } from 'notistack';
import {
  useCategoriesTree,
  useDeleteCategory,
  useImportCategories,
} from '@/api/hooks/useCategories';
import { CategoryModal } from '@/components/admin/categories/CategoryModal';
import { CategoryTranslationsModal } from '@/components/admin/categories/CategoryTranslationsModal';
import { DeleteCategoryModal } from '@/components/admin/categories/DeleteCategoryModal';
import { ImportJsonModal, Skeleton } from '@/components/admin/shared';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { Category, CategoryTree as CategoryTreeType } from '@/types/api-schema';
import styles from './CategoryTree.module.scss';
import { CategoryTreeNode } from './CategoryTreeNode';

export const CategoryTree: FC<{ type?: 'category' | 'genre' | 'collection' }> = ({
  type = 'category',
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { data: treeData, isLoading, isError } = useCategoriesTree(type);

  // Search state
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [initialParentId, setInitialParentId] = useState<string | null>(null);

  const [isTranslationsModalOpen, setIsTranslationsModalOpen] = useState(false);
  const [categoryForTranslations, setCategoryForTranslations] = useState<Category | undefined>(
    undefined
  );

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | undefined>(undefined);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const importMutation = useImportCategories({
    onSuccess: (result) => {
      enqueueSnackbar(
        `Import complete: ${result.imported} created, ${result.updated} updated${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`,
        { variant: result.errors.length > 0 ? 'warning' : 'success' }
      );
      if (result.errors.length > 0) {
        result.errors.forEach((err) => {
          enqueueSnackbar(`${err.key}: ${err.message}`, { variant: 'error' });
        });
      }
    },
    onError: (error) => {
      enqueueSnackbar(`Import failed: ${error.message}`, { variant: 'error' });
    },
  });

  const handleImportJson = async (jsonData: string) => {
    const parsed = JSON.parse(jsonData);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    await importMutation.mutateAsync(items);
  };

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

  const handleTranslations = (category: CategoryTreeType) => {
    setCategoryForTranslations(category);
    setIsTranslationsModalOpen(true);
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

  const pageTitle =
    type === 'genre' ? 'Genres' : type === 'collection' ? 'Collections' : 'Categories';
  const buttonLabel =
    type === 'genre' ? 'Add Genre' : type === 'collection' ? 'Add Collection' : 'Add Category';

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{pageTitle}</h1>
          <Skeleton variant="button" width={140} />
        </div>
        <div className={styles.searchContainer}>
          <Skeleton variant="rect" height={40} style={{ borderRadius: '4px' }} />
        </div>
        <div className={styles.tree}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-light)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Skeleton variant="rect" width={20} height={20} />
                <Skeleton variant="text" width={200} />
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <Skeleton variant="button" width={32} />
                  <Skeleton variant="button" width={32} />
                  <Skeleton variant="button" width={32} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <div className={styles.emptyState}>Failed to load categories. Please try again.</div>;
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>{pageTitle}</h1>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<FileJson size={18} />}
          >
            Import JSON
          </Button>
          <Button onClick={handleCreateClick} leftIcon={<Plus size={18} />}>
            {buttonLabel}
          </Button>
        </div>
      </div>

      <div className={styles.searchContainer}>
        <Input
          placeholder={`Search ${pageTitle.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={18} />}
        />
      </div>

      <div className={styles.treeContainer}>
        {filteredTree.map((node) => (
          <CategoryTreeNode
            key={node.id}
            node={node}
            level={0}
            onEdit={handleEdit}
            onTranslations={handleTranslations}
            onDelete={handleDelete}
            onAddSubcategory={handleAddSubcategory}
            forceExpand={!!search.trim()}
          />
        ))}
      </div>

      {isModalOpen && (
        <CategoryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          category={selectedCategory}
          initialParentId={initialParentId}
          type={type}
        />
      )}

      {isTranslationsModalOpen && categoryForTranslations && (
        <CategoryTranslationsModal
          isOpen={isTranslationsModalOpen}
          onClose={() => setIsTranslationsModalOpen(false)}
          category={categoryForTranslations}
        />
      )}

      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        categoryName={categoryToDelete?.name || ''}
        isDeleting={deleteMutation.isPending}
      />

      <ImportJsonModal
        isOpen={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onImport={handleImportJson}
        isLoading={importMutation.isPending}
        title={`Import ${pageTitle} Data (5 Languages)`}
        description={`Paste the JSON containing ${pageTitle.toLowerCase()} and translations for 5 languages.`}
        placeholder={`[\n  {\n    "key": "example-key",\n    "type": "${type}",\n    "parentKey": null,\n    "indexable": true,\n    "isVisible": true,\n    "sortOrder": 10,\n    "translations": {\n      "en": { "name": "Example", "slug": "example" }\n    }\n  }\n]`}
      />
    </div>
  );
};
