'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { BookCardModel } from '@/types/api-schema';
import { BookCard } from './BookCard';
import styles from './BookSection.module.scss';

interface BookSectionProps {
  title: string;
  subtitle?: string;
  books: BookCardModel[];
  viewMoreHref?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  priorityCount?: number;
}

export function BookSection({
  title,
  subtitle,
  books,
  viewMoreHref,
  loading = false,
  size = 'md',
  priorityCount = 0,
}: BookSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {viewMoreHref && (
          <Link href={viewMoreHref} className={styles.viewMoreBtn}>
            {t('home.viewMore')} <ChevronRight size={16} />
          </Link>
        )}
      </div>

      <div className={styles.carousel}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonCover} />
              <div className={styles.skeletonText}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </div>
            </div>
          ))
        ) : books.length > 0 ? (
          books.map((book, idx) => (
            <BookCard key={book.id} book={book} size={size} priority={idx < priorityCount} />
          ))
        ) : (
          <div className={styles.empty}>No books found</div>
        )}
      </div>
    </section>
  );
}
