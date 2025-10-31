'use client';

import { useState } from 'react';
import type { FC } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useBooks } from '@/api/hooks/useAdmin';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './BookListTable.module.scss';

interface BookListTableProps {
  /** Текущий язык интерфейса */
  lang: SupportedLang;
}

/**
 * Таблица со списком книг для админки
 *
 * Отображает список всех книг с пагинацией, поиском и фильтрацией
 */
export const BookListTable: FC<BookListTableProps> = (props) => {
  const { lang } = props;

  // State для управления пагинацией и поиском
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');

  // Получаем данные через React Query
  const { data, isLoading, error } = useBooks({
    page,
    limit: 20,
    search: search || undefined,
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

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Books Management</h1>
        </div>
        <div className={styles.loading}>Loading books...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Books Management</h1>
        </div>
        <div className={styles.error}>
          <p>Failed to load books</p>
          <p className={styles.errorMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  // Вычисляем данные пагинации
  const totalPages = data?.meta.totalPages || 0;
  const totalItems = data?.meta.total || 0;
  const books = data?.data || [];

  return (
    <div className={styles.container}>
      {/* Header с поиском */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Books Management</h1>
          <Link href={`/admin/${lang}/books/create`} className={styles.createButton}>
            + Create Book
          </Link>
        </div>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search by title, author or slug..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
          {search && (
            <button type="button" onClick={handleClearSearch} className={styles.clearButton}>
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Информация о результатах */}
      <div className={styles.info}>
        <p>
          Showing <strong>{books.length}</strong> of <strong>{totalItems}</strong> books
          {search && ` for "${search}"`}
        </p>
      </div>

      {/* Таблица книг */}
      {books.length === 0 ? (
        <div className={styles.empty}>
          <p>No books found</p>
          {search && <p>Try adjusting your search query</p>}
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cover</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Language</th>
                  <th>Categories</th>
                  <th>Versions</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => {
                  // Форматируем рейтинг
                  const formattedRating = book.rating ? book.rating.toFixed(1) : 'N/A';

                  // Извлекаем количество версий
                  const versionsCount = book.versions?.length || 0;

                  return (
                    <tr key={book.id}>
                      {/* Обложка */}
                      <td className={styles.coverCell}>
                        {book.coverUrl ? (
                          <Image
                            src={book.coverUrl}
                            alt={book.title}
                            width={60}
                            height={90}
                            className={styles.cover}
                          />
                        ) : (
                          <div className={styles.noCover}>No cover</div>
                        )}
                      </td>

                      {/* Название */}
                      <td className={styles.titleCell}>
                        <Link href={`/admin/${lang}/books/${book.id}`} className={styles.bookLink}>
                          {book.title}
                        </Link>
                        <span className={styles.slug}>{book.slug}</span>
                      </td>

                      {/* Автор */}
                      <td>{book.author}</td>

                      {/* Язык */}
                      <td>
                        <span className={styles.languageBadge}>{book.language}</span>
                      </td>

                      {/* Категории */}
                      <td>
                        {book.categories && book.categories.length > 0 ? (
                          <div className={styles.categories}>
                            {book.categories.map((cat) => (
                              <span key={cat.id} className={styles.categoryBadge}>
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={styles.noData}>—</span>
                        )}
                      </td>

                      {/* Версии */}
                      <td className={styles.versionsCell}>
                        <span className={styles.versionsBadge}>
                          {versionsCount} {versionsCount === 1 ? 'version' : 'versions'}
                        </span>
                      </td>

                      {/* Рейтинг */}
                      <td className={styles.ratingCell}>
                        <span className={styles.rating}>⭐ {formattedRating}</span>
                      </td>

                      {/* Действия */}
                      <td className={styles.actionsCell}>
                        <Link
                          href={`/admin/${lang}/books/${book.id}`}
                          className={styles.actionButton}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className={styles.paginationButton}
              >
                Previous
              </button>

              <span className={styles.paginationInfo}>
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={styles.paginationButton}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
