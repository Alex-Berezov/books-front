'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { Eye, Headphones, FileText, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSnackbar } from 'notistack';
import { useBooks, useDeleteBook } from '@/api/hooks';
import { CreateBookModal, DeleteBookModal } from '@/components/admin/books';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './BookListTable.module.scss';

interface BookListTableProps {
  /** Current interface language */
  lang: SupportedLang;
}

/**
 * Books list table for admin panel
 *
 * Displays list of all books with pagination, search and filtering
 */
export const BookListTable: FC<BookListTableProps> = (props) => {
  const { lang } = props;

  // Get current user session to check role
  const { data: session } = useSession();
  const isAdmin = session?.user?.roles?.includes('admin') || false;
  const { enqueueSnackbar } = useSnackbar();

  // State for managing pagination and search
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);

  // Get data through React Query
  const { data, isLoading, error } = useBooks({
    page,
    limit: 20,
    search: search || undefined,
  });

  // Delete book mutation
  const deleteBookMutation = useDeleteBook({
    onSuccess: () => {
      enqueueSnackbar('Book deleted successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to delete book: ${error.message}`, { variant: 'error' });
    },
  });

  // Search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchValue);
    setPage(1); // Reset to first page on search
  };

  // Clear search handler
  const handleClearSearch = () => {
    setSearchValue('');
    setSearch('');
    setPage(1);
  };

  /**
   * Open delete modal for a book
   */
  const handleOpenDeleteModal = (bookId: string, bookTitle: string) => {
    setBookToDelete({ id: bookId, title: bookTitle });
    setIsDeleteModalOpen(true);
  };

  /**
   * Close delete modal
   */
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setBookToDelete(null);
  };

  /**
   * Confirm book deletion
   */
  const handleConfirmDelete = async () => {
    if (!bookToDelete) return;

    await deleteBookMutation.mutateAsync(bookToDelete.id);
    handleCloseDeleteModal();
  };

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
  const totalItems = data?.meta.total || 0;
  const books = data?.data || [];

  return (
    <div className={styles.container}>
      {/* Header with search */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>Books</h1>
            <p className={styles.subtitle}>Manage your book content in {lang.toUpperCase()}</p>
          </div>
          <button
            className={styles.createButton}
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Add New Book
          </button>
        </div>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search books..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
          {search && (
            <button type="button" onClick={handleClearSearch} className={styles.clearButton}>
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Results information */}
      <div className={styles.info}>
        <p>
          Showing <strong>{books.length}</strong> of <strong>{totalItems}</strong> books
          {search && ` for "${search}"`}
        </p>
      </div>

      {/* Books table */}
      {books.length === 0 ? (
        <div className={styles.empty}>
          <p>No books found</p>
          {search && <p>Try adjusting your search query</p>}
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>TITLE</th>
                  <th>SLUG</th>
                  <th>CONTENT</th>
                  <th>UPDATED</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => {
                  // Find version for current language or fallback to first version
                  const currentLangVersion = book.versions?.find((v) => v.language === lang);
                  const displayVersion = currentLangVersion || book.versions?.[0];

                  // Determine content types available
                  const hasText = book.versions?.some((v) => v.type === 'text');
                  const hasAudio = book.versions?.some((v) => v.type === 'audio');

                  // Determine status
                  // If we have a version for current language, use its status.
                  // Otherwise, if we have any versions, check if any is published?
                  // Or just default to 'draft' if no version exists or status is missing.
                  const status = displayVersion?.status || 'draft';

                  // Determine title
                  // Use version title if available, otherwise book title, otherwise slug
                  const displayTitle = displayVersion?.title || book.title || book.slug;

                  // Format date
                  const updatedDate = new Date(book.updatedAt).toISOString().split('T')[0];

                  return (
                    <tr key={book.id}>
                      {/* Title */}
                      <td className={styles.titleCell}>
                        <Link
                          href={`/admin/${lang}/books/versions/${displayVersion?.id || 'new'}?bookId=${book.id}`}
                          className={styles.bookLink}
                        >
                          {displayTitle}
                        </Link>
                      </td>

                      {/* Slug */}
                      <td className={styles.slugCell}>{book.slug}</td>

                      {/* Content Icons */}
                      <td className={styles.contentCell}>
                        <div className={styles.icons}>
                          <span className={`${styles.icon} ${styles.iconView}`} title="View">
                            <Eye size={16} />
                          </span>
                          {hasAudio && (
                            <span className={`${styles.icon} ${styles.iconAudio}`} title="Audio">
                              <Headphones size={16} />
                            </span>
                          )}
                          {hasText && (
                            <span className={`${styles.icon} ${styles.iconText}`} title="Text">
                              <FileText size={16} />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Updated */}
                      <td className={styles.dateCell}>{updatedDate}</td>

                      {/* Status */}
                      <td className={styles.statusCell}>
                        <span className={`${styles.statusBadge} ${styles[status]}`}>{status}</span>
                      </td>

                      {/* Actions */}
                      <td className={styles.actionsCell}>
                        <div className={styles.actions}>
                          <Link
                            href={`/admin/${lang}/books/versions/${displayVersion?.id || 'new'}?bookId=${book.id}`}
                            className={styles.actionButton}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenDeleteModal(book.id, displayTitle)}
                              className={`${styles.actionButton} ${styles.delete}`}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className={styles.paginationButton}
              >
                Previous
              </button>

              <span className={styles.paginationInfo}>
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={styles.paginationButton}
              >
                Next
              </button>
            </div>
          )}
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
        isOpen={isDeleteModalOpen}
        bookTitle={bookToDelete?.title || ''}
        isDeleting={deleteBookMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDeleteModal}
      />
    </div>
  );
};
