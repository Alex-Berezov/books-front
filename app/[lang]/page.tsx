'use client';

import { Skeleton } from 'antd';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useBooks } from '@/api/hooks/useBooks';
import { useCategories } from '@/api/hooks/useCategories';
import { Button } from '@/components/common/Button';
import { BookSection } from '@/components/public/books/BookSection';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from '../page.module.scss';

type Props = {
  params: { lang: string };
};

export default function PublicLangPage({ params }: Props) {
  const { lang } = params;
  const supportedLang = lang as SupportedLang;

  // Fetch books (limit 100 for client-side sorting and filtering)
  const { data: booksData, isLoading: loadingBooks } = useBooks({ limit: 100 });
  const { data: categoriesData, isLoading: loadingCats } = useCategories({ limit: 50 });

  const allBooks = (booksData?.data || []).filter((book) =>
    book.versions?.some((v) => v.status === 'published')
  );
  const categories = categoriesData?.data || [];

  // Filter & Sort books
  const popularBooks = [...allBooks].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);

  const newReleases = [...allBooks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const audiobooks = allBooks
    .filter(
      (b) =>
        b.hasAudio ||
        b.versions?.some(
          (v) =>
            v.type === 'audio' ||
            ((v as unknown as { _count?: { audioChapters: number } })._count?.audioChapters || 0) >
              0
        )
    )
    .slice(0, 10);

  // Filter classics and fantasy by category slug
  const classicBooks = allBooks
    .filter((b) =>
      b.categories?.some(
        (c) =>
          ['classics', 'classic-literature', 'classic'].includes(c.id) ||
          c.translations?.some((t) => t.name.toLowerCase().includes('classic'))
      )
    )
    .slice(0, 8);

  const fantasyBooks = allBooks
    .filter((b) =>
      b.categories?.some(
        (c) =>
          ['fantasy', 'sci-fi-fantasy'].includes(c.id) ||
          c.translations?.some((t) => t.name.toLowerCase().includes('fantasy'))
      )
    )
    .slice(0, 8);

  return (
    <div className={styles.main}>
      {/* Banner */}
      <div className={styles.bannerContainer}>
        <div className={styles.bannerContent}>
          <div className={styles.bannerText}>
            <h1 className={styles.bannerTitle}>Your Digital Library, Curated for You</h1>
            <p className={styles.bannerSubtitle}>
              Read and listen to thousands of books. Build your personal bookshelf and track your
              reading progress.
            </p>
            <div className={styles.bannerActions}>
              <Link href={`/${supportedLang}/catalog`} passHref legacyBehavior>
                <Button variant="primary" size="lg" className={styles.primaryBtn}>
                  Browse Library
                </Button>
              </Link>
              <Link href={`/${supportedLang}/catalog?type=audio`} passHref legacyBehavior>
                <Button variant="secondary" size="lg" className={styles.secondaryBtn}>
                  Audiobooks
                </Button>
              </Link>
            </div>
          </div>

          {/* Book Stack */}
          <div className={styles.bookStack}>
            {loadingBooks
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton.Button
                    key={i}
                    active
                    className={styles.stackSkeleton}
                    style={{ height: 130 + i * 15 }}
                  />
                ))
              : allBooks.slice(0, 4).map((book, i) => (
                  <Link
                    key={book.id}
                    href={`/${supportedLang}/book/${book.slug || book.id}`}
                    className={styles.stackBook}
                    style={{
                      height: 130 + i * 15,
                      backgroundColor: 'var(--bibliaris-green)',
                    }}
                  >
                    {book.coverUrl && (
                      <img src={book.coverUrl} alt={book.title} className={styles.stackCover} />
                    )}
                  </Link>
                ))}
          </div>
        </div>
      </div>

      <div className={styles.sectionsContainer}>
        {/* Top Popular */}
        <BookSection
          title="Top Popular"
          books={popularBooks}
          viewMoreHref={`/${supportedLang}/catalog?sort=popular`}
          loading={loadingBooks}
        />

        {/* Genres Row */}
        <section className={styles.genresSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Genres</h2>
            <Link href={`/${supportedLang}/genres`} passHref legacyBehavior>
              <Button variant="ghost" className={styles.viewMoreBtn}>
                View All <ChevronRight size={16} />
              </Button>
            </Link>
          </div>
          <div className={styles.genresCarousel}>
            {loadingCats
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton.Button key={i} active className={styles.genreSkeletonCard} />
                ))
              : categories.slice(0, 8).map((cat) => {
                  // Find translation for current language or fallback to english
                  const translation =
                    cat.translations?.find((t) => t.language === supportedLang) ||
                    cat.translations?.[0];
                  const name = translation?.name || cat.id;
                  const catSlug = translation?.slug || cat.slug || cat.id;

                  return (
                    <Link
                      key={cat.id}
                      href={`/${supportedLang}/catalog/${catSlug}`}
                      className={styles.genreCard}
                      style={{ backgroundColor: 'var(--bibliaris-green)' }}
                    >
                      <div className={styles.genreOverlay} />
                      <div className={styles.genreInfo}>
                        <p className={styles.genreName}>{name}</p>
                        <p className={styles.genreCount}>{cat.booksCount || 0} books</p>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </section>

        {/* New Releases */}
        <BookSection
          title="New Releases"
          books={newReleases}
          viewMoreHref={`/${supportedLang}/catalog?sort=new`}
          loading={loadingBooks}
        />

        {/* Audiobooks */}
        <BookSection
          title="Audiobooks"
          books={audiobooks}
          viewMoreHref={`/${supportedLang}/catalog?type=audio`}
          loading={loadingBooks}
        />

        {/* Classic Literature */}
        {classicBooks.length > 0 && (
          <BookSection
            title="Classic Literature"
            books={classicBooks}
            viewMoreHref={`/${supportedLang}/catalog/classics`}
            loading={loadingBooks}
          />
        )}

        {/* Fantasy & Adventure */}
        {fantasyBooks.length > 0 && (
          <BookSection
            title="Fantasy & Adventure"
            books={fantasyBooks}
            viewMoreHref={`/${supportedLang}/catalog/fantasy`}
            loading={loadingBooks}
          />
        )}
      </div>
    </div>
  );
}
