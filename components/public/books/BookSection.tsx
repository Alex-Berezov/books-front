'use client';

import { Button, Skeleton } from 'antd';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { BookOverview } from '@/types/api-schema';
import { BookCard } from './BookCard';
import styles from './BookSection.module.scss';

interface BookSectionProps {
  title: string;
  books: BookOverview[];
  viewMoreHref?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BookSection({
  title,
  books,
  viewMoreHref,
  loading = false,
  size = 'md',
}: BookSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {viewMoreHref && (
          <Link href={viewMoreHref} passHref legacyBehavior>
            <Button type="text" className={styles.viewMoreBtn}>
              {t('home.viewMore')} <ChevronRight size={16} />
            </Button>
          </Link>
        )}
      </div>

      <div className={styles.carousel}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton.Button active className={styles.skeletonCover} />
              <Skeleton active paragraph={{ rows: 2 }} title={false} />
            </div>
          ))
        ) : books.length > 0 ? (
          books.map((book) => <BookCard key={book.id} book={book} size={size} />)
        ) : (
          <div className={styles.empty}>No books found</div>
        )}
      </div>
    </section>
  );
}
