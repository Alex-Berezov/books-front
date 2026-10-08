'use client';

import { useState, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useDebounce } from 'use-debounce';
import { useAuthors, useDeleteAuthor } from '@/api/hooks/useAuthors';
import { EditButton, DeleteButton } from '@/components/admin/common/ActionButtons';
import { Button } from '@/components/admin/common/Button';
import { EmptyState, Pagination, Skeleton } from '@/components/admin/shared';
import { Input } from '@/components/common/Input';
import type { Author } from '@/types/api-schema';
import { CreateAuthorModal } from '../CreateAuthorModal';
import styles from './AuthorList.module.scss';

const AUTHORS_PAGE_SIZE = 20;

interface AuthorListProps {
  lang: string;
}

export const AuthorList: FC<AuthorListProps> = ({ lang }) => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [searchValue, setSearchValue] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // Поиск ходит на сервер (`LEGACY-352`): без задержки запрос уходил бы на каждую букву.
  const [debouncedSearch] = useDebounce(searchValue.trim(), 500);
  // Страница привязана к терму, по которому выбрана: новый терм начинается с первой
  // страницы в тот же момент, когда уходит в запрос, а не раньше — сброс по вводу
  // отправлял бы лишний запрос «страница 1 со старым термом». Состояние перезаписывается
  // при смене терма (правка состояния в рендере), иначе возврат к прежнему терму
  // поднял бы его старую страницу.
  const [pageState, setPageState] = useState({ search: '', page: 1 });
  if (pageState.search !== debouncedSearch) setPageState({ search: debouncedSearch, page: 1 });
  const page = pageState.search === debouncedSearch ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ search: debouncedSearch, page: next });

  const { data, isLoading, error } = useAuthors({
    page,
    limit: AUTHORS_PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const deleteMutation = useDeleteAuthor();

  const authors = data?.items || [];
  const totalPages = data?.pagination.totalPages;

  // Выдача сжалась (удалён последний автор страницы): страница за концом списка
  // показала бы «пусто» без пагинатора и без пути назад. Зажим — в рендере, как и сброс
  // по терму выше: эффект успел бы нарисовать кадр ложного «пусто».
  if (totalPages !== undefined && page > Math.max(1, totalPages)) {
    setPageState({ search: debouncedSearch, page: Math.max(1, totalPages) });
  }

  const emptyDescription = debouncedSearch
    ? `Nothing matches "${debouncedSearch}" by name.`
    : 'Create a new author to get started.';

  const handleCreate = () => {
    setIsCreateOpen(true);
  };

  const handleEdit = (author: Author) => {
    router.push(`/admin/${lang}/authors/${author.id}/edit`);
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
            placeholder="Search authors by name..."
          />
        </div>
      </div>

      {/* Ошибка — на месте таблицы, а не вместо экрана: поле поиска остаётся, и новый
          запрос можно отправить без перезагрузки. Пагинатор при ошибке скрыт — данных
          о числе страниц у упавшего запроса нет (решение арбитра по T102). */}
      {error ? (
        <div className={styles.error}>Error loading authors: {error.message}</div>
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="95%" />
        </div>
      ) : authors.length === 0 ? (
        <EmptyState title="No authors found" description={emptyDescription} />
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

      {totalPages !== undefined && totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <CreateAuthorModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} lang={lang} />
    </div>
  );
};
