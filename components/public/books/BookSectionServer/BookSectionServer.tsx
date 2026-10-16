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
  // Раздел без книг не рисуется вовсе: главная собирается с `.catch(() => null)` на каждый
  // запрос и кэшируется на 5 минут (`app/[lang]/page.tsx`, `revalidate = 300`), и при отказе
  // бэкенда, например на перезапуске при выкате, «Top Popular» висел пустым заголовком
  // с «книг не найдено» до следующей перегенерации.
  if (books.length === 0) return null;

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
        {books.map((book, idx) => (
          <BookCardServer
            key={book.id}
            book={book}
            lang={lang}
            labels={labels.bookCardLabels}
            size={size}
            priority={idx < priorityCount}
          />
        ))}
      </div>
    </section>
  );
}
