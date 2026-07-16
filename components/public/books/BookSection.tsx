'use client';

import { Button, Skeleton } from 'antd';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLangFromPath } from '@/lib/i18n/lang';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toBookCardModel } from '@/lib/mappers/book';
import type { BookOverview } from '@/types/api-schema';
import { BookCard } from './BookCard';
import styles from './BookSection.module.scss';

interface BookSectionProps {
  title: string;
  subtitle?: string;
  books: BookOverview[];
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
  const pathname = usePathname();
  const lang = getLangFromPath(pathname);

  // TODO(R2): remove this mapper once homepage/author switch to compact /cards endpoints.
  // For R1 we map BookOverview -> BookCardModel here so BookCard can take the minimal model
  // without breaking the still-legacy homepage/author callers.
  const cardModels = books.map((b) => toBookCardModel(b, lang));

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
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
        ) : cardModels.length > 0 ? (
          cardModels.map((book, idx) => (
            <BookCard key={book.id} book={book} size={size} priority={idx < priorityCount} />
          ))
        ) : (
          <div className={styles.empty}>No books found</div>
        )}
      </div>
    </section>
  );
}
