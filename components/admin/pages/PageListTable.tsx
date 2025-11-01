'use client';

import { useState } from 'react';
import type { FC } from 'react';
import Link from 'next/link';
import { usePages } from '@/api/hooks/useAdmin';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicationStatus } from '@/types/api-schema';
import styles from './PageListTable.module.scss';

interface PageListTableProps {
  /** Текущий язык интерфейса */
  lang: SupportedLang;
}

/**
 * Таблица со списком CMS страниц для админки
 *
 * Отображает список всех страниц с пагинацией, поиском и фильтрацией
 */
export const PageListTable: FC<PageListTableProps> = (props) => {
  const { lang } = props;

  // State для управления пагинацией, поиском и фильтрами
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<PublicationStatus | 'all'>('all');

  // Получаем данные через React Query
  const { data, isLoading, error } = usePages({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    lang, // Передаем язык в параметрах запроса
  });

  // Обработчик поиска
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchValue);
    setPage(1); // Сбрасываем на первую страницу при поиске
  };

  // Обработчик очистки поиска
  const handleClearSearch = () => {
    setSearchValue('');
    setSearch('');
    setPage(1);
  };

  // Обработчик изменения фильтра статуса
  const handleStatusFilterChange = (status: PublicationStatus | 'all') => {
    setStatusFilter(status);
    setPage(1); // Сбрасываем на первую страницу при изменении фильтра
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Pages Management</h1>
        </div>
        <div className={styles.loading}>Loading pages...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Pages Management</h1>
          <Link href={`/admin/${lang}/pages/new`} className={styles.createButton}>
            + Create Page
          </Link>
        </div>
        <div className={styles.error}>
          <p>API endpoint not available yet</p>
          <p className={styles.errorMessage}>
            The /pages endpoint is not implemented on the backend yet. You can still create new
            pages using the button above.
          </p>
          <p className={styles.errorMessage}>Error: {error.message}</p>
        </div>
      </div>
    );
  }

  // Проверка на отсутствие данных (может быть при ошибке без error объекта)
  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Pages Management</h1>
          <Link href={`/admin/${lang}/pages/new`} className={styles.createButton}>
            + Create Page
          </Link>
        </div>
        <div className={styles.error}>
          <p>No data available</p>
          <p className={styles.errorMessage}>
            Unable to load pages. The API might be unavailable or returned an error.
          </p>
        </div>
      </div>
    );
  }

  // Проверка на правильный формат данных (должен быть объект с meta и data, а не массив)
  if (Array.isArray(data) || !data.meta || !data.data) {
    console.error('Invalid data format received:', data);
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Pages Management</h1>
          <Link href={`/admin/${lang}/pages/new`} className={styles.createButton}>
            + Create Page
          </Link>
        </div>
        <div className={styles.error}>
          <p>Invalid API response format</p>
          <p className={styles.errorMessage}>
            Expected paginated response with meta and data fields, but received:{' '}
            {Array.isArray(data) ? 'an array' : 'invalid object'}
          </p>
          <p className={styles.errorMessage}>
            This might indicate that the backend is returning data in an unexpected format.
          </p>
        </div>
      </div>
    );
  }

  // Вычисляем данные пагинации
  const totalPages = data.meta.totalPages || 0;
  const totalItems = data.meta.total || 0;
  const pages = data.data || [];

  return (
    <div className={styles.container}>
      {/* Header с поиском */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Pages Management</h1>
          <Link href={`/admin/${lang}/pages/new`} className={styles.createButton}>
            + Create Page
          </Link>
        </div>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search by title or slug..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className={styles.clearButton}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </form>

        {/* Фильтр по статусу */}
        <div className={styles.filters}>
          <label className={styles.filterLabel}>Status:</label>
          <div className={styles.filterButtons}>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('all')}
              className={`${styles.filterButton} ${statusFilter === 'all' ? styles.active : ''}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('draft')}
              className={`${styles.filterButton} ${statusFilter === 'draft' ? styles.active : ''}`}
            >
              Draft
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('published')}
              className={`${styles.filterButton} ${statusFilter === 'published' ? styles.active : ''}`}
            >
              Published
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('archived')}
              className={`${styles.filterButton} ${statusFilter === 'archived' ? styles.active : ''}`}
            >
              Archived
            </button>
          </div>
        </div>
      </div>

      {/* Пагинация сверху */}
      {totalPages > 1 && (
        <div className={styles.paginationTop}>
          <span className={styles.paginationInfo}>
            Page {page} of {totalPages} ({totalItems} total pages)
          </span>
        </div>
      )}

      {/* Таблица страниц */}
      {pages.length === 0 ? (
        <div className={styles.empty}>
          <p>No pages found</p>
          {search && <p className={styles.emptyHint}>Try a different search term</p>}
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Language</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((pageItem) => (
                <tr key={pageItem.id}>
                  <td className={styles.titleCell}>
                    <Link href={`/admin/${lang}/pages/${pageItem.id}`} className={styles.titleLink}>
                      {pageItem.title}
                    </Link>
                  </td>
                  <td className={styles.slugCell}>
                    <code>{pageItem.slug}</code>
                  </td>
                  <td className={styles.langCell}>
                    <span className={styles.langBadge}>{pageItem.language.toUpperCase()}</span>
                  </td>
                  <td className={styles.statusCell}>
                    <span className={`${styles.statusBadge} ${styles[pageItem.status]}`}>
                      {pageItem.status}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(pageItem.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className={styles.actionsCell}>
                    <Link
                      href={`/admin/${lang}/pages/${pageItem.id}`}
                      className={styles.editButton}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Пагинация снизу */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={styles.paginationButton}
          >
            ← Previous
          </button>
          <span className={styles.paginationInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={styles.paginationButton}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};
