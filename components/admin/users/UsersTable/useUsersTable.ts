import { useState, useEffect } from 'react';
import { useUsers, useDeleteUser } from '@/api/hooks/useUsers';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { RoleName } from '@/types/api-schema';
import type { UUID } from '@/types/api-schema/common';

interface UseUsersTableProps {
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

export const useUsersTable = ({ lang: _lang }: UseUsersTableProps) => {
  // State
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleName | undefined>(undefined);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);

  // Debounce search
  const debouncedSearch = useDebounce(searchValue, 500);

  // Fetch data
  const { data, isLoading, error } = useUsers({
    page: page === 1 ? undefined : page,
    limit: undefined, // Use backend default
    search: debouncedSearch || undefined,
    role: roleFilter,
    isActive: isActiveFilter,
  });

  // Mutations
  const deleteUser = useDeleteUser();

  // Handlers
  const handleRoleFilterChange = (role: string) => {
    setRoleFilter(role === 'all' ? undefined : (role as RoleName));
    setPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    if (status === 'all') {
      setIsActiveFilter(undefined);
    } else {
      setIsActiveFilter(status === 'active');
    }
    setPage(1);
  };

  const handleDeleteUser = async (id: UUID) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteUser.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Failed to delete user');
      }
    }
  };

  return {
    // State
    page,
    setPage,
    searchValue,
    setSearchValue,
    roleFilter,
    isActiveFilter,

    // Data
    data,
    isLoading,
    error,

    // Handlers
    handleRoleFilterChange,
    handleStatusFilterChange,
    handleDeleteUser,
  };
};
