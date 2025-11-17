'use client';

import { useState } from 'react';
import type { FC } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
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
  const deleteBookMutation = useDeleteBook();

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

    try {
      await deleteBookMutation.mutateAsync(bookToDelete.id);
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Failed to delete book:', error);
      // Error will be shown by React Query
    }
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
          <h1 className={styles.title}>Books Management</h1>
          <button
            className={styles.createButton}
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Create Book
          </button>
        </div>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search by title, author or slug..."
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
                  <th>Cover</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Language</th>
                  <th>Categories</th>
                  <th>Versions</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => {
                  // Format rating
                  const formattedRating = book.rating ? book.rating.toFixed(1) : 'N/A';

                  // Extract the number of versions
                  const versionsCount = book.versions?.length || 0;

                  // Get data from first version (if exists)
                  const firstVersion = book.versions?.[0];
                  const displayTitle = firstVersion?.title || book.title || book.slug;
                  const displayAuthor = firstVersion?.author || book.author;
                  const displayCover =
                    firstVersion?.coverImageUrl || firstVersion?.coverUrl || book.coverUrl;

                  // Get all unique languages from versions
                  const languages = book.versions?.length
                    ? Array.from(new Set(book.versions.map((v) => v.language).filter(Boolean)))
                    : book.language
                      ? [book.language]
                      : [];

                  return (
                    <tr key={book.id}>
                      {/* Cover */}
                      <td className={styles.coverCell}>
                        {displayCover ? (
                          <Image
                            src={displayCover}
                            alt={displayTitle}
                            width={60}
                            height={90}
                            className={styles.cover}
                          />
                        ) : (
                          <div className={styles.noCover}>No cover</div>
                        )}
                      </td>

                      {/* Title */}
                      <td className={styles.titleCell}>
                        {versionsCount > 0 && book.versions && book.versions[0] ? (
                          <Link
                            href={`/admin/${lang}/books/versions/${book.versions[0].id}`}
                            className={styles.bookLink}
                          >
                            {displayTitle}
                          </Link>
                        ) : (
                          <span className={styles.bookLink}>{displayTitle}</span>
                        )}
                        <span className={styles.slug}>{book.slug}</span>
                      </td>

                      {/* Author */}
                      <td>{displayAuthor || <span className={styles.noData}>—</span>}</td>

                      {/* Language - show all languages from versions */}
                      <td>
                        {languages.length > 0 ? (
                          <div className={styles.languages}>
                            {languages.map((lng) => (
                              <span key={lng} className={styles.languageBadge}>
                                {lng}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={styles.noData}>—</span>
                        )}
                      </td>

                      {/* Categories */}
                      <td>
                        {book.categories && book.categories.length > 0 ? (
                          <div className={styles.categories}>
                            {book.categories.map((cat) => (
                              <span key={cat.id} className={styles.categoryBadge}>
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={styles.noData}>—</span>
                        )}
                      </td>

                      {/* Versions */}
                      <td className={styles.versionsCell}>
                        {versionsCount > 0 && book.versions ? (
                          <div className={styles.versionsList}>
                            {(() => {
                              // Group versions by type
                              const grouped = book.versions.reduce(
                                (acc, version) => {
                                  const type = version.type;
                                  acc[type] = (acc[type] || 0) + 1;
                                  return acc;
                                },
                                {} as Record<string, number>
                              );

                              return Object.entries(grouped).map(([type, count]) => (
                                <span key={type} className={styles.versionBadge}>
                                  {type === 'text' && '📖'}
                                  {type === 'audio' && '🎧'}
                                  {type === 'referral' && '🔗'}
                                  {type}
                                  {count > 1 && (
                                    <span className={styles.versionCount}>×{count}</span>
                                  )}
                                </span>
                              ));
                            })()}
                          </div>
                        ) : (
                          <span className={styles.noData}>—</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className={styles.ratingCell}>
                        <span className={styles.rating}>⭐ {formattedRating}</span>
                      </td>

                      {/* Actions */}
                      <td className={styles.actionsCell}>
                        <div className={styles.actionsButtons}>
                          {versionsCount > 0 && book.versions && book.versions[0] ? (
                            <Link
                              href={`/admin/${lang}/books/versions/${book.versions[0].id}`}
                              className={styles.actionButton}
                            >
                              Edit
                            </Link>
                          ) : (
                            <Link
                              href={`/admin/${lang}/books/new?bookId=${book.id}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}`}
                              className={styles.actionButton}
                            >
                              Add Version
                            </Link>
                          )}

                          {/* Delete button - only for admins */}
                          {isAdmin && (
                            <button
                              type="button"
                              className={`${styles.actionButton} ${styles.deleteButton}`}
                              onClick={() => handleOpenDeleteModal(book.id, displayTitle)}
                            >
                              Delete
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
