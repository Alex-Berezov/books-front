'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, Skeleton } from 'antd';
import {
  BookOpen,
  Headphones,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  Calendar,
  Globe,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { rateBook } from '@/api/endpoints/rating';
import { useBooks } from '@/api/hooks/useBooks';
import { useBookshelf, useAddToBookshelf, useRemoveFromBookshelf } from '@/api/hooks/useBookshelf';
import { useBookOverview } from '@/api/hooks/usePublic';
import { Button } from '@/components/common/Button';
import { BookCard } from '@/components/public/books/BookCard';
import { StarRating } from '@/components/public/books/StarRating';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/lib/utils/toast';
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

  const { status } = useSession();
  const { data: bookshelfData } = useBookshelf(1, 100, {
    enabled: status === 'authenticated',
  });
  const addToBookshelfMutation = useAddToBookshelf();
  const removeFromBookshelfMutation = useRemoveFromBookshelf();

  const [activeTabKey, setActiveTabKey] = useState('about');

  const queryClient = useQueryClient();
  const [userRating, setUserRating] = useState<number>(0);
  const [isRatingPending, setIsRatingPending] = useState(false);

  const handleRateBook = async (score: number) => {
    if (!book) return;
    if (status !== 'authenticated') {
      router.push(`/${supportedLang}/auth/sign-in?callbackUrl=/${supportedLang}/book/${slug}`);
      return;
    }
    setIsRatingPending(true);
    try {
      await rateBook(book.id, score);
      setUserRating(score);
      toast.success('Thank you for rating this book!');
      // Invalidate query to get new average rating
      await queryClient.invalidateQueries({
        queryKey: queryKeys.bookOverview(supportedLang, slug),
      });
    } catch (err) {
      toast.error('Failed to submit rating. Please try again.');
      console.error(err);
    } finally {
      setIsRatingPending(false);
    }
  };

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
        <Button variant="secondary" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const versionIds = book.versionIds;
  const textVersion = versionIds?.text
    ? book.versions?.find((v) => v.id === versionIds.text)
    : null;
  const audioVersion = versionIds?.audio
    ? book.versions?.find((v) => v.id === versionIds.audio)
    : null;

  const versionId = textVersion?.id || audioVersion?.id || book.versions?.[0]?.id;

  const inBookshelf = !!bookshelfData?.items?.some((item) => item.bookVersion.id === versionId);

  const handleBookshelfToggle = () => {
    if (status !== 'authenticated') {
      router.push(`/${supportedLang}/auth/sign-in?callbackUrl=/${supportedLang}/book/${slug}`);
      return;
    }

    if (!versionId) return;

    if (inBookshelf) {
      removeFromBookshelfMutation.mutate(versionId);
    } else {
      addToBookshelfMutation.mutate(versionId);
    }
  };

  const relatedBooks = (relatedBooksData?.data || [])
    .filter((b) => b.id !== book.id && b.versions?.some((v) => v.status === 'published'))
    .slice(0, 6);

  const coverBgColor = '#8B7355'; // Fallback background color

  return (
    <div className={styles.bookPage}>
      <div className={styles.container}>
        {/* Back Button */}
        <Button
          variant="ghost"
          leftIcon={<ChevronLeft size={16} />}
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

            {status === 'authenticated' && (
              <div className={styles.myRatingRow}>
                <span className={styles.myRatingLabel}>
                  {(supportedLang as string) === 'ru' ? 'Оценить книгу:' : 'Rate this book:'}
                </span>
                <StarRating
                  rating={userRating}
                  size="md"
                  showCount={false}
                  interactive={!isRatingPending}
                  onRate={handleRateBook}
                />
              </div>
            )}

            {/* Categories */}
            <div className={styles.tagsContainer}>
              {book.categories?.map((cat) => {
                const trans =
                  cat.translations?.find((t) => t.language === supportedLang) ||
                  cat.translations?.[0];
                const catSlug = trans?.slug || cat.slug || cat.id;
                return (
                  <Link
                    key={cat.id}
                    href={`/${supportedLang}/catalog/${catSlug}`}
                    passHref
                    legacyBehavior
                  >
                    <Button variant="secondary" size="sm">
                      {trans?.name || cat.id}
                    </Button>
                  </Link>
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
                  <Button variant="secondary" size="lg" leftIcon={<BookOpen size={18} />}>
                    {textVersion.isFree ? 'Read Free' : 'Read'}
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="lg" leftIcon={<BookOpen size={18} />} disabled>
                  Read
                </Button>
              )}

              {audioVersion ? (
                <Link
                  href={`/${supportedLang}/listen/${slug}/${audioVersion.id}`}
                  passHref
                  legacyBehavior
                >
                  <Button variant="secondary" size="lg" leftIcon={<Headphones size={18} />}>
                    Listen
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="lg" leftIcon={<Headphones size={18} />} disabled>
                  Listen
                </Button>
              )}

              {book.hasSummary && (
                <Link
                  href={`/${supportedLang}/summary/${slug}/${textVersion?.id || audioVersion?.id || book.versions?.[0]?.id || ''}`}
                  passHref
                  legacyBehavior
                >
                  <Button variant="secondary" size="lg" leftIcon={<FileText size={18} />}>
                    Summary
                  </Button>
                </Link>
              )}

              <Button
                variant="secondary"
                size="lg"
                active={inBookshelf}
                loading={addToBookshelfMutation.isPending || removeFromBookshelfMutation.isPending}
                leftIcon={inBookshelf ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                onClick={handleBookshelfToggle}
              >
                {inBookshelf ? 'In Bookshelf' : 'Add to Bookshelf'}
              </Button>
            </div>

            {/* Tags (moved below actions) */}
            {book.tags && book.tags.length > 0 && (
              <div className={styles.bookTagsContainer}>
                {book.tags.map((tag) => {
                  const trans =
                    tag.translations?.find((t) => t.language === supportedLang) ||
                    tag.translations?.[0];
                  const tagName = trans?.name || tag.id;
                  return (
                    <Link
                      key={tag.id}
                      href={`/${supportedLang}/catalog?q=${encodeURIComponent(tagName)}`}
                      passHref
                      legacyBehavior
                    >
                      <Button variant="secondary" size="sm">
                        {tagName}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}

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
        <div id="book-tabs-section" className={styles.tabsWrapper}>
          <Tabs
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
            items={[
              {
                key: 'about',
                label: 'About',
                children: (
                  <div className={styles.tabContent}>
                    {book.description ? (
                      <div
                        className={styles.description}
                        dangerouslySetInnerHTML={{ __html: book.description }}
                      />
                    ) : (
                      <p className={styles.description}>No description available for this book.</p>
                    )}
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
    </div>
  );
}
