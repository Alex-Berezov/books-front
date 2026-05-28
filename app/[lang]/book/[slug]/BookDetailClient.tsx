'use client';

import { useState } from 'react';
import { Tabs, Button, Badge, Skeleton } from 'antd';
import {
  BookOpen,
  Headphones,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  Calendar,
  Globe,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBooks } from '@/api/hooks/useBooks';
import { useBookOverview } from '@/api/hooks/usePublic';
import { BookCard } from '@/components/public/books/BookCard';
import { StarRating } from '@/components/public/books/StarRating';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';
import styles from './book.module.scss';

type Props = {
  slug: string;
  lang: string;
  initialBook?: BookOverview;
};

export default function BookDetailClient({ slug, lang, initialBook }: Props) {
  const supportedLang = lang as SupportedLang;
  const router = useRouter();

  // Fetch book overview using the public api hook, fallback to initial data
  const {
    data: book,
    isLoading,
    error,
  } = useBookOverview(supportedLang, slug, {
    initialData: initialBook,
  });

  // Fetch related/all books for "You Might Also Like"
  const { data: relatedBooksData } = useBooks({ limit: 10 });

  // Simple state for bookshelf mockup/placeholder
  const [inBookshelf, setInBookshelf] = useState(false);

  if (isLoading && !book) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.container}>
          <Skeleton.Button active style={{ width: 100, marginBottom: 24 }} />
          <div className={styles.heroGrid}>
            <Skeleton.Button active className={styles.skeletonCover} />
            <div className={styles.heroDetails}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>Book not found or an error occurred.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const textVersion = book.versions?.find((v) => v.type === 'text');
  const audioVersion = book.versions?.find((v) => v.type === 'audio');

  const relatedBooks = (relatedBooksData?.data || [])
    .filter((b) => b.id !== book.id && b.versions?.some((v) => v.status === 'published'))
    .slice(0, 6);

  const coverBgColor = '#8B7355'; // Fallback background color

  const handleBookshelfToggle = () => {
    setInBookshelf(!inBookshelf);
  };

  return (
    <main className={styles.bookPage}>
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

        {/* Hero Section */}
        <div className={styles.heroGrid}>
          {/* Cover */}
          <div className={styles.coverWrapper}>
            <div className={styles.coverImageContainer} style={{ backgroundColor: coverBgColor }}>
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className={styles.coverImg} />
              ) : (
                <div className={styles.coverPlaceholder}>
                  <BookOpen size={48} className={styles.placeholderIcon} />
                  <span className={styles.placeholderText}>{book.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Book Info */}
          <div className={styles.infoWrapper}>
            <h1 className={styles.title}>{book.title}</h1>
            <p className={styles.author}>
              by{' '}
              <Link
                href={`/${supportedLang}/author/${encodeURIComponent((book.author || '').trim().toLowerCase().replace(/\s+/g, '-'))}`}
                className={styles.authorLink}
              >
                {book.author || 'Unknown'}
              </Link>
            </p>

            {book.rating !== undefined && book.rating !== null && (
              <div className={styles.ratingRow}>
                <StarRating rating={book.rating} size="md" showCount={false} />
                <span className={styles.ratingVal}>{book.rating.toFixed(1)} / 5</span>
              </div>
            )}

            {/* Categories & Tags */}
            <div className={styles.tagsContainer}>
              {book.categories?.map((cat) => {
                const trans =
                  cat.translations?.find((t) => t.language === supportedLang) ||
                  cat.translations?.[0];
                return (
                  <Badge
                    key={cat.id}
                    className={styles.categoryBadge}
                    count={trans?.name || cat.id}
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--public-primary)',
                      border: '1px solid var(--public-primary)',
                    }}
                  />
                );
              })}
              {book.tags?.map((tag) => {
                const trans =
                  tag.translations?.find((t) => t.language === supportedLang) ||
                  tag.translations?.[0];
                return (
                  <span key={tag.id} className={styles.tag}>
                    #{trans?.name || tag.id}
                  </span>
                );
              })}
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              {textVersion ? (
                <Link
                  href={`/${supportedLang}/read/${slug}/${textVersion.id}`}
                  passHref
                  legacyBehavior
                >
                  <Button
                    type="primary"
                    size="large"
                    icon={<BookOpen size={18} />}
                    className={styles.actionBtn}
                  >
                    {textVersion.isFree ? 'Read Free' : 'Read'}
                  </Button>
                </Link>
              ) : (
                <Button
                  size="large"
                  icon={<BookOpen size={18} />}
                  disabled
                  className={styles.actionBtn}
                >
                  Read
                </Button>
              )}

              {audioVersion ? (
                <Link
                  href={`/${supportedLang}/listen/${slug}/${audioVersion.id}`}
                  passHref
                  legacyBehavior
                >
                  <Button
                    size="large"
                    icon={<Headphones size={18} />}
                    className={styles.secondaryBtn}
                  >
                    Listen
                  </Button>
                </Link>
              ) : (
                <Button
                  size="large"
                  icon={<Headphones size={18} />}
                  disabled
                  className={styles.secondaryBtn}
                >
                  Listen
                </Button>
              )}

              <Button
                size="large"
                icon={inBookshelf ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                onClick={handleBookshelfToggle}
                className={inBookshelf ? styles.bookshelfActiveBtn : styles.secondaryBtn}
              >
                {inBookshelf ? 'In Bookshelf' : 'Add to Bookshelf'}
              </Button>
            </div>

            {/* Meta details */}
            <div className={styles.metadataList}>
              {book.publicationYear && (
                <div className={styles.metaItem}>
                  <Calendar size={16} />
                  <span>Published: {book.publicationYear}</span>
                </div>
              )}
              {book.language && (
                <div className={styles.metaItem}>
                  <Globe size={16} />
                  <span>Language: {(book.language || '').toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs section */}
        <div className={styles.tabsWrapper}>
          <Tabs
            defaultActiveKey="about"
            items={[
              {
                key: 'about',
                label: 'About',
                children: (
                  <div className={styles.tabContent}>
                    <p className={styles.description}>
                      {book.description || 'No description available for this book.'}
                    </p>
                  </div>
                ),
              },
              {
                key: 'details',
                label: 'Details',
                children: (
                  <div className={styles.detailsGrid}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Author</span>
                      <span className={styles.detailValue}>{book.author}</span>
                    </div>
                    {book.publicationYear && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Publication Year</span>
                        <span className={styles.detailValue}>{book.publicationYear}</span>
                      </div>
                    )}
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Language</span>
                      <span className={styles.detailValue}>
                        {(book.language || '').toUpperCase()}
                      </span>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>

        {/* You Might Also Like */}
        {relatedBooks.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.sectionTitle}>You Might Also Like</h2>
            <div className={styles.booksGrid}>
              {relatedBooks.map((b) => (
                <BookCard key={b.id} book={b} size="md" />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
