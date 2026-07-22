import { getRelatedBooks } from '@/api/endpoints/public';
import { BookCardServer } from '@/components/public/books/BookCardServer/BookCardServer';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './RelatedBooksSection.module.scss';

interface RelatedBooksSectionProps {
  lang: string;
  slug: string;
}

export async function RelatedBooksSection({ lang, slug }: RelatedBooksSectionProps) {
  const supportedLang = lang as SupportedLang;
  const dict = getDictionary(supportedLang);

  let relatedBooks;
  try {
    relatedBooks = await getRelatedBooks(supportedLang, slug, 8);
  } catch {
    return null;
  }

  const authorBooks = relatedBooks.sameAuthor;
  const similarBooks = relatedBooks.similar;

  if (authorBooks.length === 0 && similarBooks.length === 0) {
    return null;
  }

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
                labels={{
                  coverAltTemplate: dict.a11y?.bookCover || '{title} cover',
                  readLabel: dict.book?.read || 'Read',
                  listenLabel: dict.book?.listen || 'Listen',
                  newLabel: 'New',
                  unknownAuthor: dict.book?.unknownAuthor || 'Unknown Author',
                }}
                size="md"
              />
            ))}
          </div>
        </section>
      )}

      {similarBooks.length > 0 && (
        <section className={styles.relatedSection}>
          <h2 className={styles.sectionTitle}>{dict.book.youMightLike}</h2>
          <div className={styles.booksGrid}>
            {similarBooks.map((bookItem) => (
              <BookCardServer
                key={bookItem.id}
                book={bookItem}
                lang={supportedLang}
                labels={{
                  coverAltTemplate: dict.a11y?.bookCover || '{title} cover',
                  readLabel: dict.book?.read || 'Read',
                  listenLabel: dict.book?.listen || 'Listen',
                  newLabel: 'New',
                  unknownAuthor: dict.book?.unknownAuthor || 'Unknown Author',
                }}
                size="md"
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
