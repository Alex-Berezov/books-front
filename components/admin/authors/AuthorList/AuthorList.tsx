'use client';

import { useState, type FC } from 'react';
import { useSnackbar } from 'notistack';
import { useAuthors, useDeleteAuthor } from '@/api/hooks/useAuthors';
import { EditButton, DeleteButton } from '@/components/admin/common/ActionButtons';
import { EmptyState, Skeleton } from '@/components/admin/shared';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { Author } from '@/types/api-schema';
import { AuthorModal } from '../AuthorModal';
import styles from './AuthorList.module.scss';

interface AuthorListProps {
  lang: string;
}

export const AuthorList: FC<AuthorListProps> = ({ lang }) => {
  const { enqueueSnackbar } = useSnackbar();

  const page = 1;
  const [searchValue, setSearchValue] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAuthor, setActiveAuthor] = useState<Author | null>(null);

  const { data, isLoading, error } = useAuthors({ page, limit: 100 });
  const deleteMutation = useDeleteAuthor();

  const rawAuthors = data?.data || [];

  // Filter on client side
  const authors = rawAuthors.filter((author) => {
    if (!searchValue) return true;
    const searchLower = searchValue.toLowerCase();
    const matchesSlug = author.slug.toLowerCase().includes(searchLower);
    const matchesName = author.translations?.some((t) =>
      t.name.toLowerCase().includes(searchLower)
    );
    return matchesSlug || matchesName;
  });

  const handleCreate = () => {
    setActiveAuthor(null);
    setIsModalOpen(true);
  };

  const handleEdit = (author: Author) => {
    setActiveAuthor(author);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this author?')) {
      try {
        await deleteMutation.mutateAsync(id);
        enqueueSnackbar('Author deleted successfully', { variant: 'success' });
      } catch (err) {
        enqueueSnackbar((err as Error).message || 'Failed to delete author', { variant: 'error' });
      }
    }
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error loading authors: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Authors Management</h1>
        <Button variant="primary" onClick={handleCreate}>
          + Create Author
        </Button>
      </div>

      <div className={styles.controls}>
        <div className={styles.search}>
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search authors by name or slug..."
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="95%" />
        </div>
      ) : authors.length === 0 ? (
        <EmptyState title="No authors found" description="Create a new author to get started." />
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name (English / First Available)</th>
                <th>Slug</th>
                <th>Life Dates</th>
                <th>Books Count</th>
                <th className={styles.actionsHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {authors.map((author) => {
                // Find translation or fall back
                const translation =
                  author.translations?.find((t) => t.language === 'en') || author.translations?.[0];
                const displayName = translation?.name || 'Unnamed Author';
                const lifeDates =
                  author.birthDate || author.deathDate
                    ? `${author.birthDate || '???'} — ${author.deathDate || 'Present'}`
                    : 'Not specified';

                return (
                  <tr key={author.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <strong>{displayName}</strong>
                        {author.translations && author.translations.length > 1 && (
                          <span className={styles.translationsCount}>
                            ({author.translations.length} languages)
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <code>{author.slug}</code>
                    </td>
                    <td>{lifeDates}</td>
                    <td>{author.booksCount || 0}</td>
                    <td>
                      <div className={styles.actionsCell}>
                        <EditButton onClick={() => handleEdit(author)} />
                        <DeleteButton onClick={() => handleDelete(author.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AuthorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        author={activeAuthor}
        lang={lang}
      />
    </div>
  );
};
