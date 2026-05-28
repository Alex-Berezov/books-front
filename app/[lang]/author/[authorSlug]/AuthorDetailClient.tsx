'use client';

import { Button, Divider, Skeleton } from 'antd';
import { ChevronLeft, BookOpen, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBooks } from '@/api/hooks/useBooks';
import { BookCard } from '@/components/public/books/BookCard';
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
  const searchName = decodeAuthorSlug(authorSlug ?? '');

  // Fetch all books to filter by author on the client
  const { data: booksData, isLoading } = useBooks({ limit: 100 });

  const allBooks = booksData?.data || [];
  const authorBooks = allBooks.filter(
    (b: BookOverview) => b.author && b.author.toLowerCase() === searchName.toLowerCase()
  );

  const finalDisplayName = authorBooks.length > 0 ? authorBooks[0].author : displayName;
  const totalBooks = authorBooks.length;
  const hasAudiobooks = authorBooks.some((b) => b.versions?.some((v) => v.type === 'audio'));
  const ratings = authorBooks
    .map((b) => b.rating)
    .filter((r): r is number => typeof r === 'number');
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
      : null;

  return (
    <main className={styles.authorPage}>
      <div className={styles.container}>
        {/* Back Button */}
        <Button
          type="text"
          icon={<ChevronLeft size={16} />}
          onClick={() => router.back()}
          className={styles.backBtn}
        >
          Back
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
                    {totalBooks} {totalBooks === 1 ? 'book' : 'books'} in library
                  </span>
                  {hasAudiobooks && (
                    <span className={styles.audioAvailable}>Audiobooks available</span>
                  )}
                  {avgRating && <span className={styles.statItem}>★ {avgRating} Avg Rating</span>}
                </>
              )}
            </div>
          </div>
        </div>

        <Divider className={styles.divider} />

        {/* Books section */}
        <section className={styles.booksSection}>
          <h2 className={styles.sectionTitle}>Books by {finalDisplayName}</h2>

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
              <h3 className={styles.emptyTitle}>No books found</h3>
              <p className={styles.emptyText}>
                We do not have any books by this author in our library yet.
              </p>
              <Button type="primary" onClick={() => router.push(`/${supportedLang}/catalog`)}>
                Browse Catalog
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
    </main>
  );
}
