import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { BookCardModel } from '@/types/api-schema';
import { BookCardServer } from '../BookCardServer/BookCardServer';
import styles from '../BookSection.module.scss';

interface BookSectionServerProps {
  title: string;
  subtitle?: string;
  books: BookCardModel[];
  lang: string;
  labels: {
    viewMoreLabel: string;
    bookCardLabels: {
      coverAltTemplate: string;
      readLabel: string;
      listenLabel: string;
      newLabel: string;
      unknownAuthor: string;
    };
  };
  viewMoreHref?: string;
  size?: 'sm' | 'md' | 'lg';
  priorityCount?: number;
}

export function BookSectionServer({
  title,
  subtitle,
  books,
  lang,
  labels,
  viewMoreHref,
  size = 'md',
  priorityCount = 0,
}: BookSectionServerProps) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {viewMoreHref && (
          <Link href={viewMoreHref} className={styles.viewMoreBtn}>
            {labels.viewMoreLabel} <ChevronRight size={16} />
          </Link>
        )}
      </div>

      <div className={styles.carousel}>
        {books.length > 0 ? (
          books.map((book, idx) => (
            <BookCardServer
              key={book.id}
              book={book}
              lang={lang}
              labels={labels.bookCardLabels}
              size={size}
              priority={idx < priorityCount}
            />
          ))
        ) : (
          <div className={styles.empty}>No books found</div>
        )}
      </div>
    </section>
  );
}
