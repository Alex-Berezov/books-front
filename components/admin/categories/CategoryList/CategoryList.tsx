'use client';

import { useState, type ChangeEvent, type FC } from 'react';
import { Globe } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { useCategories, useDeleteCategory } from '@/api/hooks/useCategories';
import { CategoryModal } from '@/components/admin/categories/CategoryModal';
import { CategoryTranslationsModal } from '@/components/admin/categories/CategoryTranslationsModal';
import { DeleteCategoryModal } from '@/components/admin/categories/DeleteCategoryModal';
import { EditButton, DeleteButton } from '@/components/admin/common/ActionButtons';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LANGUAGE_FLAGS, type SupportedLang } from '@/lib/i18n/lang';
import type { Category, CategoryTranslation } from '@/types/api-schema';
import styles from './CategoryList.module.scss';

interface CategoryListProps {
  lang: SupportedLang;
}

export const CategoryList: FC<CategoryListProps> = ({ lang: _lang }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | undefined>(undefined);
  const [isTranslationsModalOpen, setIsTranslationsModalOpen] = useState(false);
  const [categoryForTranslations, setCategoryForTranslations] = useState<Category | undefined>(
    undefined
  );
  const { enqueueSnackbar } = useSnackbar();
  // Fetch all categories for client-side filtering
  const limit = 1000;

  const { data, isLoading, isError } = useCategories({
    page: 1,
    limit,
  });

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

  // Handle case where backend returns array instead of paginated response
  const rawCategories = Array.isArray(data) ? data : data?.data || [];

  // Client-side filtering
  const categories = rawCategories.filter((category) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      category.name.toLowerCase().includes(searchLower) ||
      category.slug.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = !Array.isArray(data) ? data?.meta?.totalPages : 1;

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleCreate = () => {
    setSelectedCategory(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(undefined);
  };

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete.id);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setCategoryToDelete(undefined);
  };

  const handleTranslations = (category: Category) => {
    setCategoryForTranslations(category);
    setIsTranslationsModalOpen(true);
  };

  const handleCloseTranslationsModal = () => {
    setIsTranslationsModalOpen(false);
    setCategoryForTranslations(undefined);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Categories</h1>
        <Button variant="primary" onClick={handleCreate}>
          Add Category
        </Button>
      </div>

      <div className={styles.controls}>
        <div className={styles.search}>
          <Input placeholder="Search categories..." value={search} onChange={handleSearchChange} />
        </div>
      </div>

      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.loading}>Loading categories...</div>
        ) : isError ? (
          <div className={styles.error}>Failed to load categories</div>
        ) : categories.length === 0 ? (
          <div className={styles.emptyState}>No categories found</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Translations</th>
                <th>Books Count</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{category.slug}</td>
                  <td>
                    <div className={styles.translationsCell}>
                      <div className={styles.flags}>
                        {category.translations?.map((translation: CategoryTranslation) => (
                          <span
                            key={translation.language}
                            title={`${translation.name} (${translation.language.toUpperCase()})`}
                            className={styles.flag}
                          >
                            {LANGUAGE_FLAGS[translation.language as SupportedLang] ||
                              translation.language}
                          </span>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTranslations(category)}
                        title="Manage Translations"
                      >
                        <Globe size={16} />
                      </Button>
                    </div>
                  </td>
                  <td>{category.booksCount || 0}</td>
                  <td>{category.type || '-'}</td>
                  <td>
                    <div className={styles.actions}>
                      <EditButton onClick={() => handleEdit(category)} />
                      <DeleteButton onClick={() => handleDelete(category)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages && totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
          >
            Previous
          </Button>
          <span style={{ margin: '0 1rem', alignSelf: 'center' }}>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page === totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <CategoryModal isOpen={isModalOpen} onClose={handleCloseModal} category={selectedCategory} />

      {categoryForTranslations && (
        <CategoryTranslationsModal
          isOpen={isTranslationsModalOpen}
          onClose={handleCloseTranslationsModal}
          category={categoryForTranslations}
        />
      )}

      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        categoryName={categoryToDelete?.name || ''}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDeleteModal}
      />
    </div>
  );
};
