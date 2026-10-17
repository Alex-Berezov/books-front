import { getRelatedBooks } from '@/api/endpoints/public';
import { BookCardServer } from '@/components/public/books/BookCardServer/BookCardServer';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './RelatedBooksSection.module.scss';

interface RelatedBooksSectionProps {
  lang: string;
  slug: string;
  /**
   * `summary` - под пересказом: второй блок «Похожие пересказы» показывает только книги
   * с пересказом и ведёт сразу на него. По умолчанию - страница книги.
   */
  variant?: 'book' | 'summary';
}

/** Предел ручки `GET /{lang}/books/{slug}/related` на оба блока вместе: странице книги хватает 8. */
const LIMIT = { book: 8, summary: 16 } as const;

export async function RelatedBooksSection({
  lang,
  slug,
  variant = 'book',
}: RelatedBooksSectionProps) {
  const supportedLang = lang as SupportedLang;
  const dict = getDictionary(supportedLang);

  let relatedBooks;
  try {
    relatedBooks = await getRelatedBooks(supportedLang, slug, LIMIT[variant]);
  } catch {
    return null;
  }

  const authorBooks = relatedBooks.sameAuthor;
  const similarBooks =
    variant === 'summary'
      ? relatedBooks.similar.filter((book) => book.hasSummary)
      : relatedBooks.similar;

  if (authorBooks.length === 0 && similarBooks.length === 0) {
    return null;
  }

  const labels = {
    coverAltTemplate: dict.a11y?.bookCover || '{title} cover',
    readLabel: dict.book?.read || 'Read',
    listenLabel: dict.book?.listen || 'Listen',
    newLabel: dict.book.newRelease,
    unknownAuthor: dict.book?.unknownAuthor || 'Unknown Author',
  };

  return (
    <>
      {authorBooks.length > 0 && (
        <section className={styles.relatedSection}>
          <h2 className={styles.sectionTitle}>{dict.book.sameAuthor}</h2>
          <div className={styles.booksGrid}>
            {authorBooks.map((bookItem) => (
              <BookCardServer
                key={bookItem.id}
                book={bookItem}
                lang={supportedLang}
                labels={labels}
                size="md"
              />
            ))}
          </div>
        </section>
      )}

      {similarBooks.length > 0 && (
        <section className={styles.relatedSection}>
          <h2 className={styles.sectionTitle}>
            {variant === 'summary' ? dict.book.similarSummaries : dict.book.youMightLike}
          </h2>
          <div className={styles.booksGrid}>
            {similarBooks.map((bookItem) => (
              <BookCardServer
                key={bookItem.id}
                book={bookItem}
                lang={supportedLang}
                labels={labels}
                size="md"
                linkTarget={variant === 'summary' ? 'summary' : 'book'}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
