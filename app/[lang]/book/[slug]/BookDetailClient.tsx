'use client';

import { useState, useEffect } from 'react';
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
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { rateBook } from '@/api/endpoints/rating';
import { useBooks, useUserBookRating, bookKeys } from '@/api/hooks/useBooks';
import { useBookshelf, useAddToBookshelf, useRemoveFromBookshelf } from '@/api/hooks/useBookshelf';
import { useBookOverview, useSeoResolve } from '@/api/hooks/usePublic';
import { Button } from '@/components/common/Button';
import { BookCard } from '@/components/public/books/BookCard';
import { StarRating } from '@/components/public/books/StarRating';
import BookReviews from '@/components/public/reviews/BookReviews';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/lib/utils/toast';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';
import styles from './book.module.scss';

const getHomeName = (lang: string): string => {
  switch (lang) {
    case 'ru':
      return 'Главная';
    case 'es':
      return 'Inicio';
    case 'pt':
      return 'Início';
    case 'fr':
      return 'Accueil';
    case 'en':
    default:
      return 'Home';
  }
};

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

  // Fetch SEO data (including breadcrumbs)
  const { data: seoData } = useSeoResolve(supportedLang, 'book', slug);

  // Fetch related/all books for "You Might Also Like"
  const { data: relatedBooksData } = useBooks({ limit: 10 });

  const { status } = useSession();
  const { data: bookshelfData } = useBookshelf(1, 100, {
    enabled: status === 'authenticated',
  });
  const addToBookshelfMutation = useAddToBookshelf();
  const removeFromBookshelfMutation = useRemoveFromBookshelf();

  const queryClient = useQueryClient();
  const { data: userRatingData } = useUserBookRating(book?.id || '', {
    enabled: !!book?.id && status === 'authenticated',
  });

  const [userRating, setUserRating] = useState<number>(0);
  const [isRatingPending, setIsRatingPending] = useState(false);

  // Sync user rating from server
  useEffect(() => {
    if (userRatingData?.score !== undefined && userRatingData?.score !== null) {
      setUserRating(userRatingData.score);
    }
  }, [userRatingData]);

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
      // Invalidate query to get new average rating and user rating
      await queryClient.invalidateQueries({
        queryKey: queryKeys.bookOverview(supportedLang, slug),
      });
      await queryClient.invalidateQueries({
        queryKey: bookKeys.userRating(book.id),
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
  const activeVersion = textVersion || audioVersion || book.versions?.[0] || null;

  const textHasSummary = textVersion
    ? ((textVersion as unknown as { _count?: { summaries: number } })._count?.summaries || 0) > 0
    : false;
  const audioHasSummary = audioVersion
    ? ((audioVersion as unknown as { _count?: { summaries: number } })._count?.summaries || 0) > 0
    : false;
  const hasSummary = textHasSummary || audioHasSummary;
  const summaryVersionId = textHasSummary
    ? textVersion?.id
    : audioHasSummary
      ? audioVersion?.id
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
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href={`/${supportedLang}`}>{getHomeName(supportedLang)}</Link>
          {seoData?.breadcrumbPath?.map((item) => (
            <span key={item.slug} className={styles.breadcrumbItem}>
              <span className={styles.separator}>/</span>
              <Link href={`/${supportedLang}/catalog/${item.slug}`}>{item.name}</Link>
            </span>
          ))}
          <span className={styles.breadcrumbItem}>
            <span className={styles.separator}>/</span>
            <span className={styles.current}>{book.title}</span>
          </span>
        </nav>

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
                <Image
                  src={book.coverUrl}
                  alt={book.title}
                  className={styles.coverImg}
                  width={200}
                  height={290}
                  priority
                />
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
                href={
                  activeVersion?.authorPageUrl ||
                  `/${supportedLang}/author/${encodeURIComponent((book.author || '').trim().toLowerCase().replace(/\s+/g, '-'))}`
                }
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

              {hasSummary && summaryVersionId && (
                <Link
                  href={`/${supportedLang}/summary/${slug}/${summaryVersionId}`}
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
              {book.firstPublishedYear ? (
                <div className={styles.metaItem}>
                  <Calendar size={16} />
                  <span>
                    {t('book.firstPublished')} {book.firstPublishedYear}
                  </span>
                </div>
              ) : null}
              {book.editionPublishedYear ? (
                <div className={styles.metaItem}>
                  <Calendar size={16} />
                  <span>
                    {t('book.editionPublished')} {book.editionPublishedYear}
                  </span>
                </div>
              ) : null}
              {!book.firstPublishedYear && !book.editionPublishedYear && book.publicationYear ? (
                <div className={styles.metaItem}>
                  <Calendar size={16} />
                  <span>
                    {t('book.published')} {book.publicationYear}
                  </span>
                </div>
              ) : null}
              {book.language && (
                <div className={styles.metaItem}>
                  <Globe size={16} />
                  <span>
                    {t('book.language')} {(book.language || '').toUpperCase()}
                  </span>
                </div>
              )}
              {activeVersion?.originalLanguage && (
                <div className={styles.metaItem}>
                  <Globe size={16} />
                  <span>
                    {supportedLang === 'ru' ? 'Оригинальный язык' : 'Original Language'}:{' '}
                    {activeVersion.originalLanguage}
                  </span>
                </div>
              )}
              {activeVersion?.copyrightStatus && (
                <div className={styles.metaItem}>
                  <FileText size={16} />
                  <span>
                    {supportedLang === 'ru' ? 'Правовой статус' : 'Copyright Status'}:{' '}
                    {activeVersion.copyrightStatus}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Themes Section */}
        {activeVersion?.themes && activeVersion.themes.length > 0 && (
          <div className={styles.themesWrapper}>
            <hr className={styles.divider} />
            <div className={styles.themesContainer}>
              <span className={styles.themesLabel}>
                {supportedLang === 'ru' ? 'Ключевые темы:' : 'Key Themes:'}
              </span>
              <div className={styles.themesList}>
                {activeVersion.themes.map((theme) => (
                  <span key={theme} className={styles.themeTag}>
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Description section */}
        <div className={styles.descriptionWrapper}>
          <h2 className={styles.descriptionTitle}>
            {supportedLang === 'ru'
              ? `О книге «${book.title}»`
              : supportedLang === 'es'
                ? `Sobre el libro «${book.title}»`
                : supportedLang === 'pt'
                  ? `Sobre o livro «${book.title}»`
                  : supportedLang === 'fr'
                    ? `À propos du livre «${book.title}»`
                    : `About ${book.title}`}
          </h2>
          {book.description ? (
            <div
              className={styles.description}
              dangerouslySetInnerHTML={{ __html: book.description }}
            />
          ) : (
            <p className={styles.description}>{t('book.noDescription')}</p>
          )}
        </div>

        {/* Characters Section */}
        {activeVersion?.characters && activeVersion.characters.length > 0 && (
          <section className={styles.detailSection}>
            <h2 className={styles.detailTitle}>
              {supportedLang === 'ru' ? 'Персонажи' : 'Main Characters'}
            </h2>
            <div className={styles.charactersGrid}>
              {activeVersion.characters.map((char) => (
                <div key={char.name} className={styles.characterCard}>
                  <div className={styles.charName}>{char.name}</div>
                  <div className={styles.charDesc}>{char.description}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quotes Section */}
        {activeVersion?.quotes && activeVersion.quotes.length > 0 && (
          <section className={styles.detailSection}>
            <h2 className={styles.detailTitle}>{supportedLang === 'ru' ? 'Цитаты' : 'Quotes'}</h2>
            <div className={styles.quotesList}>
              {activeVersion.quotes.map((quote, idx) => (
                <blockquote key={idx} className={styles.quoteCard}>
                  <p className={styles.quoteText}>“{quote.text}”</p>
                  {quote.author && <cite className={styles.quoteAuthor}>— {quote.author}</cite>}
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* FAQ Section */}
        {activeVersion?.faq && activeVersion.faq.length > 0 && (
          <section className={styles.detailSection} style={{ marginBottom: '2rem' }}>
            <h2 className={styles.detailTitle}>
              {supportedLang === 'ru' ? 'Часто задаваемые вопросы' : 'Frequently Asked Questions'}
            </h2>
            <div className={styles.faqList}>
              {activeVersion.faq.map((item, idx) => (
                <div key={idx} className={styles.faqCard}>
                  <div className={styles.faqQuestion}>Q: {item.question}</div>
                  <div className={styles.faqAnswer}>A: {item.answer}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Book Reviews and Comments */}
        {versionId && (
          <BookReviews
            bookVersionId={versionId}
            lang={lang}
            bookSlug={slug}
            bookId={book.id}
            hasRated={!!userRatingData?.score}
          />
        )}

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
