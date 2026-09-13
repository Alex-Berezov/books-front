'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { useDeletePage, usePages } from '@/api/hooks';
import { EmptyState } from '@/components/admin/shared';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import type { PageListTableProps } from './PageListTable.types';
import type { PublicationStatus } from '@/types/api-schema';
import styles from './PageListTable.module.scss';
import { ErrorState } from './sections/ErrorState';
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

  const isFiltered = Boolean(search) || statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchValue('');
    setSearch('');
    setStatusFilter('all');
    setPage(1);
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    if (data?.pagination?.totalPages) {
      setPage((p) => Math.min(data.pagination?.totalPages ?? p + 1, p + 1));
    }
  };

  // Loading state handled in render
  // if (isLoading) { ... }

  // Error state
  if (error) {
    return <ErrorState lang={lang} errorMessage={error.message} />;
  }

  // Check for no data
  if (!data && !isLoading) {
    return <ErrorState lang={lang} errorMessage="No data available" />;
  }

  // Проверка формы ответа. Остаётся и после `LEGACY-177`, только сверяется теперь
  // с новой обёрткой `{items, pagination}`: стороны выкатываются врозь (бэкенд тегом,
  // фронт пушем), безопасного порядка у пары нет, и в окне выката сюда приходит ответ
  // ровно одной из двух форм. Без этой ветки старая обёртка развернулась бы в
  // `undefined` и уронила экран вместо внятного отказа.
  if (!isLoading && (Array.isArray(data) || !data?.pagination || !data?.items)) {
    enqueueSnackbar('Invalid API response format received', { variant: 'error' });
    return (
      <ErrorState
        lang={lang}
        errorMessage={`Invalid API response format: ${Array.isArray(data) ? 'array' : 'invalid object'}`}
      />
    );
  }

  // Calculate pagination data
  // Calculate pagination data
  const totalPages = data?.pagination?.totalPages || 0;
  const totalItems = data?.pagination?.total || 0;
  const groups = data?.items || [];

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
      {isLoading ? (
        <PageTable
          groups={[]}
          lang={lang}
          isDeletingPage={deleteMutation.isPending}
          onDelete={handleDelete}
          isLoading={true}
        />
      ) : groups.length === 0 ? (
        // Пустая выдача под фильтром — это не пустая база. Пока фильтр отвечал
        // 400 (`LEGACY-371`), сюда попадал только по-настоящему пустой список,
        // и «создайте первую страницу» было верно; теперь тот же экран
        // достижим при полном списке опубликованных страниц.
        <EmptyState
          title="No pages found"
          description={
            isFiltered ? 'No pages match the current search and filter' : 'Create your first page'
          }
          icon={<FileText />}
          action={
            isFiltered ? (
              <Button variant="secondary" onClick={handleResetFilters}>
                Reset filters
              </Button>
            ) : (
              <Link href={`/admin/${lang}/pages/new`}>
                <Button>Create Page</Button>
              </Link>
            )
          }
        />
      ) : (
        <PageTable
          groups={groups}
          lang={lang}
          isDeletingPage={deleteMutation.isPending}
          onDelete={handleDelete}
          isLoading={false}
          search={search}
          statusFilter={statusFilter}
        />
      )}

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
