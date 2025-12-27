'use client';

import { useState } from 'react';
import type { FC } from 'react';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { useDeletePage, usePages } from '@/api/hooks';
import { Modal } from '@/components/common/Modal';
import type { PageListTableProps } from './PageListTable.types';
import type { PublicationStatus } from '@/types/api-schema';
import styles from './PageListTable.module.scss';
import { EmptyState } from './sections/EmptyState';
import { ErrorState } from './sections/ErrorState';
import { LoadingState } from './sections/LoadingState';
import { PageTable } from './ui/PageTable';
import { PaginationControls } from './ui/PaginationControls';
import { SearchForm } from './ui/SearchForm';
import { StatusFilter } from './ui/StatusFilter';

/**
 * CMS Pages List Table
 *
 * Displays list of all pages with pagination, search and filtering
 */
export const PageListTable: FC<PageListTableProps> = (props) => {
  const { lang } = props;
  const { enqueueSnackbar } = useSnackbar();

  // State for pagination, search and filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<PublicationStatus | 'all'>('all');

  // State for delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<{ id: string; title: string } | null>(null);

  // Fetch data via React Query
  const { data, isLoading, error, refetch } = usePages({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  // Mutation for deleting page
  const deleteMutation = useDeletePage({
    onSuccess: () => {
      enqueueSnackbar('Page deleted successfully', { variant: 'success' });
      setIsDeleteModalOpen(false);
      setPageToDelete(null);
      refetch();
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to delete page: ${error.message}`, { variant: 'error' });
    },
  });

  // Handler for deleting page
  const handleDelete = (pageId: string, pageTitle: string) => {
    // Open confirmation modal
    setPageToDelete({ id: pageId, title: pageTitle });
    setIsDeleteModalOpen(true);
  };

  /**
   * Confirm page deletion
   */
  const handleConfirmDelete = () => {
    if (pageToDelete) {
      deleteMutation.mutate({ pageId: pageToDelete.id, lang });
    }
  };

  /**
   * Cancel deletion (close modal)
   */
  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setPageToDelete(null);
  };

  // Search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchValue);
    setPage(1);
  };

  // Clear search handler
  const handleClearSearch = () => {
    setSearchValue('');
    setSearch('');
    setPage(1);
  };

  // Status filter change handler
  const handleStatusFilterChange = (status: PublicationStatus | 'all') => {
    setStatusFilter(status);
    setPage(1);
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    if (data?.meta.totalPages) {
      setPage((p) => Math.min(data.meta.totalPages, p + 1));
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingState lang={lang} />;
  }

  // Error state
  if (error) {
    return <ErrorState lang={lang} errorMessage={error.message} />;
  }

  // Check for no data
  if (!data) {
    return <ErrorState lang={lang} errorMessage="No data available" />;
  }

  // Check for valid data format
  if (Array.isArray(data) || !data.meta || !data.data) {
    enqueueSnackbar('Invalid API response format received', { variant: 'error' });
    return (
      <ErrorState
        lang={lang}
        errorMessage={`Invalid API response format: ${Array.isArray(data) ? 'array' : 'invalid object'}`}
      />
    );
  }

  // Calculate pagination data
  const totalPages = data.meta.totalPages || 0;
  const totalItems = data.meta.total || 0;
  const groups = data.data || [];

  // Empty state
  if (groups.length === 0) {
    return <EmptyState lang={lang} search={search} />;
  }

  return (
    <div className={styles.container}>
      {/* Header with create button */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Pages Management</h1>
          <Link href={`/admin/${lang}/pages/new`} className={styles.createButton}>
            + Create Page
          </Link>
        </div>

        {/* Search form */}
        <SearchForm
          searchValue={searchValue}
          search={search}
          onSearchValueChange={setSearchValue}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
        />

        {/* Status filter */}
        <StatusFilter statusFilter={statusFilter} onStatusFilterChange={handleStatusFilterChange} />
      </div>

      {/* Pagination top */}
      {totalPages > 1 && (
        <div className={styles.paginationTop}>
          <span className={styles.paginationInfo}>
            Page {page} of {totalPages} ({totalItems} total pages)
          </span>
        </div>
      )}

      {/* Pages table */}
      <PageTable
        groups={groups}
        lang={lang}
        isDeletingPage={deleteMutation.isPending}
        onDelete={handleDelete}
      />

      {/* Pagination bottom */}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        title="Delete Page"
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      >
        <p>
          Are you sure you want to delete the page{' '}
          <strong>&ldquo;{pageToDelete?.title}&rdquo;</strong>?
        </p>
        <p>This action cannot be undone.</p>
      </Modal>
    </div>
  );
};
