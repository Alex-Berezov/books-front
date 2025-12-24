'use client';

import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useTags } from '@/api/hooks/useTags';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { TagListProps } from './TagList.types';
import styles from './TagList.module.scss';

const PAGE_SIZE = 20;

/**
 * Tags list component for admin panel
 *
 * Displays a list of tags with search and pagination.
 */
export const TagList: FC<TagListProps> = (props) => {
  const { lang } = props;

  // State for pagination and search
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');

  // Fetch tags
  const { data, isLoading, error } = useTags({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
  });

  const tags = data?.data || [];

  // Handlers
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchValue);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchValue('');
    setSearch('');
    setPage(1);
  };

  const handleNextPage = () => {
    if (data?.meta && data.meta.page < data.meta.totalPages) {
      setPage((p) => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage((p) => p - 1);
    }
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error loading tags: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Tags</h1>
        <Button
          variant="primary"
          onClick={() => {
            /* TODO: Create tag */
          }}
        >
          Create Tag
        </Button>
      </div>

      <div className={styles.controls}>
        <form onSubmit={handleSearch} className={styles.search}>
          <div className={styles.searchGroup}>
            <Input
              placeholder="Search tags..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              fullWidth
            />
            {search && (
              <Button type="button" variant="ghost" onClick={handleClearSearch}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.loadingState}>Loading...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Language</th>
                <th>Books Count</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    No tags found
                  </td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr key={tag.id}>
                    <td>{tag.name}</td>
                    <td>{tag.slug}</td>
                    <td>{tag.language.toUpperCase()}</td>
                    <td>{tag.booksCount || 0}</td>
                    <td>{new Date(tag.createdAt).toLocaleDateString(lang)}</td>
                    <td className={styles.actions}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          /* TODO: Edit */
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          /* TODO: Delete */
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className={styles.pagination}>
          <Button variant="secondary" disabled={page === 1} onClick={handlePrevPage}>
            Previous
          </Button>
          <span className={styles.pageInfo}>
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page === data.meta.totalPages}
            onClick={handleNextPage}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
