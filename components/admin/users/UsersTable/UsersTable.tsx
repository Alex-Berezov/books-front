'use client';

import type { FC } from 'react';
import { Pagination } from '@/components/admin/shared/Pagination';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { formatDate } from '@/lib/utils/date';
import type { UsersTableProps } from './UsersTable.types';
import styles from './UsersTable.module.scss';
import { useUsersTable } from './useUsersTable';

export const UsersTable: FC<UsersTableProps> = (props) => {
  const { lang } = props;

  const {
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
  } = useUsersTable({ lang });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Failed to load users</p>
          <p className={styles.errorMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const users = data?.data || [];
  const totalPages = data?.meta.totalPages || 0;

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Users Management</h1>
        </div>

        <div className={styles.searchContainer}>
          <div className={styles.searchInput}>
            <Input
              placeholder="Search by name or email..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <div className={styles.filterSelect}>
            <Select
              value={roleFilter || 'all'}
              onChange={(value) => handleRoleFilterChange(value as string)}
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'content_manager', label: 'Content Manager' },
                { value: 'user', label: 'User' },
              ]}
            />
          </div>

          <div className={styles.filterSelect}>
            <Select
              value={isActiveFilter === undefined ? 'all' : isActiveFilter ? 'active' : 'inactive'}
              onChange={(value) => handleStatusFilterChange(value as string)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
        </div>

        {users.length === 0 ? (
          <div className={styles.empty}>
            <p>No users found</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userInfo}>
                        <div className={styles.avatar}>
                          {user.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={user.avatarUrl} alt={user.displayName || user.email} />
                          ) : (
                            (user.firstName?.[0] || user.email[0]).toUpperCase()
                          )}
                        </div>
                        <div className={styles.userDetails}>
                          <span className={styles.userName}>
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.displayName || 'Unknown'}
                          </span>
                          <span className={styles.userEmail}>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {user.roles.map((role) => (
                        <span key={role} className={`${styles.roleBadge} ${styles[role]}`}>
                          {role.replace('_', ' ')}
                        </span>
                      ))}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          user.isActive ? styles.active : styles.inactive
                        }`}
                      >
                        <span className={styles.dot} />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{user.lastLoginAt ? formatDate(user.lastLoginAt, lang) : 'Never'}</td>
                    <td>{formatDate(user.createdAt, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
};
