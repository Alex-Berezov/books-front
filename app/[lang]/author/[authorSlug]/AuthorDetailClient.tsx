'use client';

import { Divider, Skeleton } from 'antd';
import { ChevronLeft, BookOpen, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBooks } from '@/api/hooks/useBooks';
import { Button } from '@/components/common/Button';
import { BookCard } from '@/components/public/books/BookCard';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';
import styles from './author.module.scss';

type Props = {
  lang: string;
  authorSlug: string;
  displayName: string;
};

function decodeAuthorSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).replace(/-/g, ' ');
  } catch {
    return slug.replace(/-/g, ' ');
  }
}

export default function AuthorDetailClient({ lang, authorSlug, displayName }: Props) {
  const supportedLang = lang as SupportedLang;
  const router = useRouter();
  const { t } = useTranslation();
  const searchName = decodeAuthorSlug(authorSlug ?? '');

  // Fetch all books to filter by author on the client
  const { data: booksData, isLoading } = useBooks({ limit: 100 });

  const allBooks = (booksData?.data || []).filter((book) =>
    book.versions?.some((v) => v.language === supportedLang && v.status === 'published')
  );
  const authorBooks = allBooks.filter(
    (b: BookOverview) => b.author && b.author.toLowerCase() === searchName.toLowerCase()
  );

  const finalDisplayName = authorBooks.length > 0 ? authorBooks[0].author : displayName;
  const totalBooks = authorBooks.length;
  const hasAudiobooks = authorBooks.some((b) =>
    b.versions?.some(
      (v) => v.language === supportedLang && v.status === 'published' && v.type === 'audio'
    )
  );
  const ratings = authorBooks
    .map((b) => b.rating)
    .filter((r): r is number => typeof r === 'number');
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
      : null;

  return (
    <div className={styles.authorPage}>
      <div className={styles.container}>
        {/* Back Button */}
        <Button
          variant="ghost"
          leftIcon={<ChevronLeft size={16} />}
          onClick={() => router.back()}
          className={styles.backBtn}
        >
          {t('author.back')}
        </Button>

        {/* Author Hero */}
        <div className={styles.authorHero}>
          <div className={styles.avatar}>
            <User size={40} className={styles.avatarIcon} />
          </div>
          <div className={styles.heroInfo}>
            <h1 className={styles.name}>{finalDisplayName}</h1>
            <div className={styles.stats}>
              {!isLoading && (
                <>
                  <span className={styles.statItem}>
                    <BookOpen size={16} />
                    {totalBooks} {totalBooks === 1 ? 'book' : 'books'} {t('author.booksInLibrary')}
                  </span>
                  {hasAudiobooks && (
                    <span className={styles.audioAvailable}>{t('author.audiobooksAvailable')}</span>
                  )}
                  {avgRating && (
                    <span className={styles.statItem}>
                      ★ {avgRating} {t('author.avgRating')}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <Divider className={styles.divider} />

        {/* Books section */}
        <section className={styles.booksSection}>
          <h2 className={styles.sectionTitle}>
            {t('author.booksBy')} {finalDisplayName}
          </h2>

          {isLoading ? (
            <div className={styles.booksGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <Skeleton.Button active className={styles.skeletonCover} />
                  <Skeleton active paragraph={{ rows: 2 }} title={false} />
                </div>
              ))}
            </div>
          ) : authorBooks.length === 0 ? (
            <div className={styles.empty}>
              <BookOpen size={48} className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>{t('author.noBooksFound')}</h3>
              <p className={styles.emptyText}>{t('author.emptyText')}</p>
              <Button variant="primary" onClick={() => router.push(`/${supportedLang}/catalog`)}>
                {t('author.browseCatalog')}
              </Button>
            </div>
          ) : (
            <div className={styles.booksGrid}>
              {authorBooks.map((book) => (
                <BookCard key={book.id} book={book} size="md" />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
