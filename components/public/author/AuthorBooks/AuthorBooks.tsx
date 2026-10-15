import { BookCardServer } from '@/components/public/books/BookCardServer/BookCardServer';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorDetail } from '@/types/api-schema';
import styles from './AuthorBooks.module.scss';
import { AuthorBooksMoreClient } from './AuthorBooksMoreClient';

interface AuthorBooksProps {
  lang: SupportedLang;
  author: Pick<PublicAuthorDetail, 'slug' | 'name' | 'books' | 'booksTotal' | 'notableWorks'>;
}

/**
 * Книги автора на сайте (`product.md` F02, §7): первые 12 по году серверными карточками,
 * остальное — «Показать все» без смены адреса. Порядок — с сервера. Лента «Главное» —
 * на книгах из главных произведений. Книг нет — блока нет (решение арбитра 15.10.2026,
 * `F02 | F02-3`, Р12).
 */
export function AuthorBooks({ lang, author }: AuthorBooksProps) {
  const books = author.books ?? [];
  if (books.length === 0) return null;

  const dict = getDictionary(lang);
  const total = author.booksTotal ?? books.length;
  const notableSlugs = (author.notableWorks ?? []).flatMap((work) =>
    work.book ? [work.book.slug] : []
  );
  const notable = new Set(notableSlugs);
  const notableLabel = dict.author.notableBadge;

  return (
    <section className={styles.section} aria-labelledby="author-books-title">
      <h2 id="author-books-title" className={styles.title}>
        {dict.author.books.replace('{name}', () => author.name)}
      </h2>
      <div className={styles.grid}>
        {books.map((book) => (
          <BookCardServer
            key={book.id}
            book={book}
            lang={lang}
            labels={{
              coverAltTemplate: dict.a11y.bookCover,
              readLabel: dict.book.read,
              listenLabel: dict.book.listen,
              newLabel: dict.book.newRelease,
              unknownAuthor: dict.book.unknownAuthor,
            }}
            size="md"
            highlightLabel={notable.has(book.slug) ? notableLabel : undefined}
          />
        ))}
      </div>
      {total > books.length && (
        <AuthorBooksMoreClient
          lang={lang}
          authorSlug={author.slug}
          total={total}
          shownIds={books.map((book) => book.id)}
          notableSlugs={notableSlugs}
          labels={{
            showAll: dict.author.showAll,
            loading: dict.author.showAllLoading,
            error: dict.author.showAllError,
            notable: notableLabel,
          }}
        />
      )}
    </section>
  );
}
