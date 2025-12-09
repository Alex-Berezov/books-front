import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSnackbar } from 'notistack';
import { useBooks, useDeleteBook } from '@/api/hooks';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { StatusFilter } from './BookListSearch';

interface UseBookListTableProps {
  lang: SupportedLang;
}

/**
 * Custom hook for debouncing a value
 */
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useBookListTable = (_props: UseBookListTableProps) => {
  const { data: session } = useSession();
  const { enqueueSnackbar } = useSnackbar();

  // State
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);

  // Debounced search value (300ms delay)
  const debouncedSearch = useDebounce(searchValue, 300);

  const isAdmin = session?.user?.roles?.includes('admin') || false;

  // Data fetching - no search/status params, API doesn't support them
  const {
    data: rawData,
    isLoading,
    error,
  } = useBooks({
    page,
    limit: 100, // Fetch more to allow client-side filtering
  });

  // Client-side filtering (API doesn't support search and status filters)
  const data = rawData
    ? {
        ...rawData,
        data: rawData.data.filter((book) => {
          // Search filter - check title, slug, author in versions
          const searchLower = debouncedSearch.toLowerCase();
          const matchesSearch =
            !debouncedSearch ||
            book.slug.toLowerCase().includes(searchLower) ||
            book.versions?.some(
              (v) =>
                v.title?.toLowerCase().includes(searchLower) ||
                v.author?.toLowerCase().includes(searchLower)
            );

          // Status filter - check if any version has the selected status
          const matchesStatus =
            statusFilter === 'all' || book.versions?.some((v) => v.status === statusFilter);

          return matchesSearch && matchesStatus;
        }),
      }
    : undefined;

  // Mutations
  const deleteBookMutation = useDeleteBook({
    onSuccess: () => {
      enqueueSnackbar('Book deleted successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to delete book: ${error.message}`, { variant: 'error' });
    },
  });

  // Handlers
  const handleStatusFilterChange = (status: StatusFilter) => {
    setStatusFilter(status);
  };

  const handleOpenDeleteModal = (bookId: string, bookTitle: string) => {
    setBookToDelete({ id: bookId, title: bookTitle });
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setBookToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!bookToDelete) return;
    await deleteBookMutation.mutateAsync(bookToDelete.id);
    handleCloseDeleteModal();
  };

  return {
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
    isDeleting: deleteBookMutation.isPending,

    // Handlers
    handleStatusFilterChange,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleConfirmDelete,
  };
};
