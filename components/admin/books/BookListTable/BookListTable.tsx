'use client';

import type { FC } from 'react';
import { CreateBookModal, DeleteBookModal } from '@/components/admin/books';
import type { BookListTableProps } from './BookListTable.types';
import { BookListHeader } from './BookListHeader';
import { BookListPagination } from './BookListPagination';
import { BookListSearch } from './BookListSearch';
import styles from './BookListTable.module.scss';
import { BookTable } from './BookTable';
import { useBookListTable } from './useBookListTable';

/**
 * Books list table for admin panel
 *
 * Displays list of all books with pagination, search and filtering
 */
export const BookListTable: FC<BookListTableProps> = (props) => {
  const { lang } = props;

  const {
    // State
    page,
    setPage,
    searchValue,
    setSearchValue,
    statusFilter,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isDeleteModalOpen,
    bookToDelete,
    isAdmin,

    // Data
    data,
    isLoading,
    error,

    // Mutation status
    isDeleting,

    // Handlers
    handleStatusFilterChange,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleConfirmDelete,
  } = useBookListTable({ lang });

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Books Management</h1>
        </div>
        <div className={styles.loading}>Loading books...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Books Management</h1>
        </div>
        <div className={styles.error}>
          <p>Failed to load books</p>
          <p className={styles.errorMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  // Calculate pagination data
  const totalPages = data?.meta.totalPages || 0;
  const books = data?.data || [];

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <BookListHeader lang={lang} onAddClick={() => setIsCreateModalOpen(true)} />
      </div>
      <div className={styles.container}>
        <BookListSearch
          onSearchValueChange={setSearchValue}
          onStatusFilterChange={handleStatusFilterChange}
          searchValue={searchValue}
          statusFilter={statusFilter}
        />

        {/* Books table */}
        {books.length === 0 ? (
          <div className={styles.empty}>
            <p>No books found</p>
            {searchValue && <p>Try adjusting your search query</p>}
          </div>
        ) : (
          <>
            <BookTable
              books={books}
              isAdmin={isAdmin}
              lang={lang}
              onDeleteClick={handleOpenDeleteModal}
            />

            {/* Pagination */}
            <BookListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}

        {/* Create Book Modal */}
        <CreateBookModal
          isOpen={isCreateModalOpen}
          lang={lang}
          onClose={() => setIsCreateModalOpen(false)}
        />

        {/* Delete Book Modal */}
        <DeleteBookModal
          bookTitle={bookToDelete?.title || ''}
          isDeleting={isDeleting}
          isOpen={isDeleteModalOpen}
          onCancel={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  );
};
