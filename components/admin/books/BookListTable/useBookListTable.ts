import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSnackbar } from 'notistack';
import { useBooks, useDeleteBook } from '@/api/hooks';
import type { SupportedLang } from '@/lib/i18n/lang';

interface UseBookListTableProps {
  lang: SupportedLang;
}

export const useBookListTable = (_props: UseBookListTableProps) => {
  const { data: session } = useSession();
  const { enqueueSnackbar } = useSnackbar();

  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);

  const isAdmin = session?.user?.roles?.includes('admin') || false;

  // Data fetching
  const { data, isLoading, error } = useBooks({
    page,
    limit: 20,
    search: search || undefined,
  });

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
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchValue);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchValue('');
    setSearch('');
    setPage(1);
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
    search,
    searchValue,
    setSearchValue,
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
    handleSearch,
    handleClearSearch,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleConfirmDelete,
  };
};
