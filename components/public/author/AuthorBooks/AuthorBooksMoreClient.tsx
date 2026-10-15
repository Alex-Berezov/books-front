'use client';

import { useState } from 'react';
import { useAuthorAllBookCards } from '@/api/hooks/usePublic';
import { Button } from '@/components/common/Button';
import { BookCard } from '@/components/public/books/BookCard';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './AuthorBooks.module.scss';

interface AuthorBooksMoreClientProps {
  lang: SupportedLang;
  authorSlug: string;
  total: number;
  /** Книги, уже показанные сервером: из догрузки отбрасываются по `id` (Р2, `F02 | F02-3`). */
  shownIds: string[];
  notableSlugs: string[];
  labels: { showAll: string; loading: string; error: string; notable: string };
}

/**
 * «Показать все» книг автора (`product.md` F02, §7): догрузка на той же странице, без нового
 * адреса и без `searchParams` — страница остаётся статичной (`revalidate`).
 */
export function AuthorBooksMoreClient({
  lang,
  authorSlug,
  total,
  shownIds,
  notableSlugs,
  labels,
}: AuthorBooksMoreClientProps) {
  const [requested, setRequested] = useState(false);
  const { data, isFetching, isError, refetch } = useAuthorAllBookCards(
    lang,
    authorSlug,
    total,
    requested
  );

  if (data) {
    const shown = new Set(shownIds);
    const notable = new Set(notableSlugs);
    const seen = new Set<string>();
    const rest = data.filter((book) => {
      if (shown.has(book.id) || seen.has(book.id)) return false;
      seen.add(book.id);
      return true;
    });
    // Книг сверх показанных не оказалось (сняли с публикации, пока страница в ISR) — пустой
    // сетки нет.
    if (rest.length === 0) return null;
    return (
      <div className={styles.grid}>
        {rest.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            size="md"
            highlightLabel={notable.has(book.slug) ? labels.notable : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.more}>
      {isError && (
        <p className={styles.error} role="alert">
          {labels.error}
        </p>
      )}
      <Button
        variant="secondary"
        onClick={() => (requested ? void refetch() : setRequested(true))}
        disabled={isFetching}
      >
        {isFetching ? labels.loading : labels.showAll}
      </Button>
    </div>
  );
}
