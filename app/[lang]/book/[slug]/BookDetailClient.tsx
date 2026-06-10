'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from 'antd';
import {
  BookOpen,
  Headphones,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  Calendar,
  Globe,
  FileText,
  User,
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
import { useTranslation } from '@/lib/i18n/useTranslation';
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
  const { t } = useTranslation();

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
      toast.success(t('book.ratingSuccess'));
      // Invalidate query to get new average rating
      await queryClient.invalidateQueries({
        queryKey: queryKeys.bookOverview(supportedLang, slug),
      });
    } catch (err) {
      toast.error(t('book.ratingError'));
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
        <p className={styles.errorText}>{t('book.notFound')}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          {t('book.back')}
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

  const inBookshelf = !!bookshelfData?.items?.some(
    (item) => item.bookVersion.bookId === book.id || item.bookVersion.id === versionId
  );

  const handleBookshelfToggle = () => {
    if (status !== 'authenticated') {
      router.push(`/${supportedLang}/auth/sign-in?callbackUrl=/${supportedLang}/book/${slug}`);
      return;
    }

    if (!versionId) return;

    if (inBookshelf) {
      const existingItem = bookshelfData?.items?.find(
        (item) => item.bookVersion.bookId === book.id || item.bookVersion.id === versionId
      );
      const idToRemove = existingItem?.bookVersion.id || versionId;
      removeFromBookshelfMutation.mutate(idToRemove);
    } else {
      addToBookshelfMutation.mutate(versionId);
    }
  };

  const relatedBooks = (relatedBooksData?.data || [])
    .filter(
      (b) =>
        b.id !== book.id &&
        b.versions?.some((v) => v.language === supportedLang && v.status === 'published')
    )
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
          {t('book.back')}
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
              {t('book.by')}{' '}
              <Link
                href={`/${supportedLang}/author/${encodeURIComponent((book.author || '').trim().toLowerCase().replace(/\s+/g, '-'))}`}
                className={styles.authorLink}
              >
                {book.author || t('book.unknownAuthor')}
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
                <span className={styles.myRatingLabel}>{t('book.rateBook')}</span>
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
              {textVersion && (
                <Link
                  href={`/${supportedLang}/read/${slug}/${textVersion.id}`}
                  passHref
                  legacyBehavior
                >
                  <Button variant="secondary" size="lg" leftIcon={<BookOpen size={18} />}>
                    {textVersion.isFree ? t('book.readFree') : t('book.read')}
                  </Button>
                </Link>
              )}

              {audioVersion && (
                <Link
                  href={`/${supportedLang}/listen/${slug}/${audioVersion.id}`}
                  passHref
                  legacyBehavior
                >
                  <Button variant="secondary" size="lg" leftIcon={<Headphones size={18} />}>
                    {t('book.listen')}
                  </Button>
                </Link>
              )}

              {book.hasSummary && (
                <Link
                  href={`/${supportedLang}/summary/${slug}/${textVersion?.id || audioVersion?.id || book.versions?.[0]?.id || ''}`}
                  passHref
                  legacyBehavior
                >
                  <Button variant="secondary" size="lg" leftIcon={<FileText size={18} />}>
                    {t('book.summary')}
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
                {inBookshelf ? t('book.inBookshelf') : t('book.addToBookshelf')}
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
              {book.author && (
                <div className={styles.metaItem}>
                  <User size={16} />
                  <span>
                    {t('book.author')}: {book.author}
                  </span>
                </div>
              )}
              {book.publicationYear && (
                <div className={styles.metaItem}>
                  <Calendar size={16} />
                  <span>
                    {t('book.published')} {book.publicationYear}
                  </span>
                </div>
              )}
              {book.language && (
                <div className={styles.metaItem}>
                  <Globe size={16} />
                  <span>
                    {t('book.language')} {(book.language || '').toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description section */}
        <div className={styles.descriptionWrapper}>
          <h2 className={styles.descriptionTitle}>{t('book.about')}</h2>
          {book.description ? (
            <div
              className={styles.description}
              dangerouslySetInnerHTML={{ __html: book.description }}
            />
          ) : (
            <p className={styles.description}>{t('book.noDescription')}</p>
          )}
        </div>

        {/* You Might Also Like */}
        {relatedBooks.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.sectionTitle}>{t('book.youMightLike')}</h2>
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
