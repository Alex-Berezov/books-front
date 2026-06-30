import { BookOpen, Calendar, Globe, User, ChevronLeft, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { permanentRedirect, notFound } from 'next/navigation';
import { getBookOverview, resolveSeo, getPublicBooks } from '@/api/endpoints/public';
import { Button } from '@/components/common/Button';
import { BookCard } from '@/components/public/books/BookCard';
import { StarRating } from '@/components/public/books/StarRating';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';
import type { Metadata } from 'next';
import styles from './book.module.scss';
import DescriptionWrapper from './DescriptionWrapper';

// Dynamically load non-critical sections (reviews and extra details) to exclude their CSS/JS from the main render-blocking bundle
const ReviewsLoading = () => {
  let text = 'Loading reviews...';
  if (typeof window !== 'undefined') {
    const segments = window.location.pathname.split('/');
    const lang = segments[1] as SupportedLang;
    try {
      const dict = getDictionary(lang);
      text = dict.book.loadingReviews || text;
    } catch (e) {
      console.error(e);
    }
  }
  return (
    <div
      style={{
        minHeight: '150px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {text}
    </div>
  );
};

const BookReviews = dynamic(() => import('@/components/public/reviews/BookReviews'), {
  ssr: false,
  loading: ReviewsLoading,
});

const BookExtraDetails = dynamic(() => import('./BookExtraDetails'), {
  ssr: false,
});

// Client Islands for interactivity
const BookActions = dynamic(() => import('./BookActions'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '48px',
        backgroundColor: 'var(--skeleton-bg)',
        borderRadius: '6px',
        width: '200px',
        animation: 'skeletonPulse 1.5s infinite ease-in-out',
      }}
    />
  ),
});

const BookRating = dynamic(() => import('./BookRating'), {
  ssr: false,
});

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;

  try {
    const seo = await resolveSeo(supportedLang, 'book', slug);
    const alternatesLanguages: Record<string, string> = {};
    (seo.hreflangs || seo.hreflang)?.forEach((item) => {
      if (item.hreflang) {
        alternatesLanguages[item.hreflang] = item.href;
      }
    });

    return {
      title: seo.meta.title,
      description: seo.meta.description || undefined,
      robots: seo.meta.robots || undefined,
      alternates: {
        canonical: seo.meta.canonicalUrl || undefined,
        languages: alternatesLanguages,
      },
      openGraph: {
        title: seo.openGraph.title,
        description: seo.openGraph.description || undefined,
        type: 'book',
        url: seo.openGraph.url,
        images: seo.openGraph.image
          ? [{ url: seo.openGraph.image.url, alt: seo.openGraph.image.alt }]
          : undefined,
      },
      twitter: {
        card: (seo.twitter.card as 'summary' | 'summary_large_image') || 'summary',
        site: seo.twitter.site || undefined,
        title: seo.twitter.title || undefined,
        description: seo.twitter.description || undefined,
        images: seo.twitter.image ? [seo.twitter.image] : undefined,
      },
    };
  } catch (error) {
    console.error('Error generating metadata for book:', error);
    let fallbackTitle = 'Book Details - Bibliaris';
    if (slug) {
      const decoded = decodeURIComponent(slug).replace(/-/g, ' ');
      fallbackTitle =
        decoded.replace(
          /\w\S*/g,
          (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
        ) + ' - Bibliaris';
    }
    return { title: fallbackTitle };
  }
}

export const revalidate = 300;

export default async function BookDetailPage({ params }: Props) {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;

  let book;
  let seoData;
  let allBooks: BookOverview[] = [];
  try {
    book = await getBookOverview(supportedLang, slug);
    seoData = await resolveSeo(supportedLang, 'book', slug);
    const booksRes = await getPublicBooks(supportedLang, { page: 1, limit: 100 });
    // Filter out books without published versions in the current language
    allBooks = (booksRes.data || []).filter((bookItem) =>
      bookItem.versions?.some(
        (version) => version.language === supportedLang && version.status === 'published'
      )
    );
  } catch (error) {
    console.error('Error loading book overview, SEO, or public books on server:', error);
  }

  if (!book) {
    notFound();
  }

  // Redirect to correct localized slug if requested slug is outdated/incorrect
  if (book.slug && book.slug !== slug) {
    permanentRedirect(`/${lang}/book/${book.slug}`);
  }

  const versionIds = book.versionIds;
  const textVersion = versionIds?.text
    ? (book.versions?.find((version) => version.id === versionIds.text) ?? null)
    : null;
  const audioVersion = versionIds?.audio
    ? (book.versions?.find((version) => version.id === versionIds.audio) ?? null)
    : null;
  const activeVersion = textVersion || audioVersion || book.versions?.[0] || null;

  // Filter books by the same author (excluding the current book)
  const authorBooks = book
    ? allBooks
        .filter(
          (bookItem) =>
            bookItem.id !== book.id &&
            bookItem.author?.trim().toLowerCase() ===
              (activeVersion?.author || book.author || '').trim().toLowerCase()
        )
        .slice(0, 4)
    : [];

  // Filter similar books (same categories, excluding the same author books to keep variety)
  const categoryIds = book?.categories?.map((category) => category.id) || [];
  let similarBooks = book
    ? allBooks.filter(
        (bookItem) =>
          bookItem.id !== book.id &&
          bookItem.author?.trim().toLowerCase() !==
            (activeVersion?.author || book.author || '').trim().toLowerCase() &&
          bookItem.categories?.some((category) => categoryIds.includes(category.id))
      )
    : [];

  // Fallback: if not enough similar books by category, fill with remaining books
  if (book && similarBooks.length < 4) {
    const excludedIds = new Set([
      book.id,
      ...authorBooks.map((bookItem) => bookItem.id),
      ...similarBooks.map((bookItem) => bookItem.id),
    ]);
    const fillBooks = allBooks.filter((bookItem) => !excludedIds.has(bookItem.id));
    similarBooks = [...similarBooks, ...fillBooks];
  }
  similarBooks = similarBooks.slice(0, 4);

  const textHasSummary = textVersion
    ? ((textVersion as unknown as { _count?: { summaries: number } })._count?.summaries || 0) > 0
    : false;
  const audioHasSummary = audioVersion
    ? ((audioVersion as unknown as { _count?: { summaries: number } })._count?.summaries || 0) > 0
    : false;
  const hasSummary = textHasSummary || audioHasSummary;
  const versionId = textVersion?.id || audioVersion?.id || book.versions?.[0]?.id;

  const dict = getDictionary(supportedLang);
  const descriptionTitle = dict.book.aboutBook.replace(
    '{title}',
    activeVersion?.title || book.title
  );
  const coverBgColor = 'var(--cover-placeholder-bg)';

  return (
    <div className={styles.bookPage}>
      <div className={styles.container}>
        {seoData?.schema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(seoData.schema) }}
          />
        )}

        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <ol
            style={{
              display: 'inline-flex',
              listStyle: 'none',
              padding: 0,
              margin: 0,
              flexWrap: 'wrap',
            }}
          >
            <li>
              <Link href={`/${supportedLang}`}>{dict.book.home}</Link>
            </li>
            {seoData?.breadcrumbPath?.map((item: { slug: string; name: string }) => (
              <li key={item.slug} className={styles.breadcrumbItem}>
                <span className={styles.separator} aria-hidden="true">
                  /
                </span>
                <Link href={`/${supportedLang}/catalog/${item.slug}`}>{item.name}</Link>
              </li>
            ))}
            <li className={styles.breadcrumbItem} aria-current="page">
              <span className={styles.separator} aria-hidden="true">
                /
              </span>
              <span className={styles.current}>{activeVersion?.title || book.title}</span>
            </li>
          </ol>
        </nav>

        {/* Back Button */}
        <Link href={`/${supportedLang}`} passHref legacyBehavior>
          <Button variant="ghost" leftIcon={<ChevronLeft size={16} />} className={styles.backBtn}>
            {dict.book.back}
          </Button>
        </Link>

        {/* Hero Section */}
        <div className={styles.heroGrid}>
          {/* Cover */}
          <div className={styles.coverWrapper}>
            <div className={styles.coverImageContainer} style={{ backgroundColor: coverBgColor }}>
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt={activeVersion?.coverAlt || activeVersion?.title || book.title}
                  className={styles.coverImg}
                  width={200}
                  height={290}
                  priority
                />
              ) : (
                <div className={styles.coverPlaceholder}>
                  <BookOpen size={48} className={styles.placeholderIcon} />
                  <span className={styles.placeholderText}>
                    {activeVersion?.title || book.title}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Book Info */}
          <div className={styles.infoWrapper}>
            <h1 className={styles.title}>{activeVersion?.title || book.title}</h1>
            <p className={styles.author}>
              {dict.book.by}{' '}
              <Link
                href={
                  activeVersion?.authorPageUrl ||
                  `/${supportedLang}/author/${encodeURIComponent((activeVersion?.author || book.author || '').trim().toLowerCase().replace(/\s+/g, '-'))}`
                }
                className={styles.authorLink}
              >
                {activeVersion?.author || book.author || dict.book.unknownAuthor}
              </Link>
            </p>

            {book.rating !== undefined && book.rating !== null && (
              <div className={styles.ratingRow}>
                <StarRating rating={book.rating} size="md" showCount={false} />
                <span className={styles.ratingVal}>{book.rating.toFixed(1)} / 5</span>
              </div>
            )}

            {/* Interactive Rating Island */}
            <BookRating bookId={book.id} slug={slug} lang={supportedLang} />

            {/* Categories */}
            <div className={styles.tagsContainer}>
              {book.categories?.map((cat) => {
                const trans =
                  cat.translations?.find((t) => t.language === supportedLang) ||
                  cat.translations?.[0];
                const catSlug = trans?.slug || cat.slug || cat.id;
                const categoryPath = cat.type === 'genre' ? 'genre' : 'category';
                return (
                  <Link
                    key={cat.id}
                    href={`/${supportedLang}/${categoryPath}/${catSlug}`}
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

            {/* Interactive Actions Island */}
            <BookActions
              slug={slug}
              lang={supportedLang}
              bookId={book.id}
              versionId={versionId}
              textVersion={textVersion}
              audioVersion={audioVersion}
              hasSummary={hasSummary}
            />

            {/* Tags */}
            {book.tags && book.tags.length > 0 && (
              <div className={styles.bookTagsContainer}>
                {book.tags.map((tag) => {
                  const trans =
                    tag.translations?.find((t) => t.language === supportedLang) ||
                    tag.translations?.[0];
                  const tagName = trans?.name || tag.name || tag.id;
                  const tagSlug = trans?.slug || tag.slug || tag.id;
                  return (
                    <Link
                      key={tag.id}
                      href={`/${supportedLang}/tag/${tagSlug}`}
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
              {(activeVersion?.author || book.author) && (
                <div className={styles.metaItem}>
                  <User size={16} />
                  <span>
                    {dict.book.author}: {activeVersion?.author || book.author}
                  </span>
                </div>
              )}
              {book.firstPublishedYear ? (
                <div className={styles.metaItem}>
                  <Calendar size={16} />
                  <span>
                    {dict.book.firstPublished} {book.firstPublishedYear}
                  </span>
                </div>
              ) : null}
              {book.editionPublishedYear ? (
                <div className={styles.metaItem}>
                  <Calendar size={16} />
                  <span>
                    {dict.book.editionPublished} {book.editionPublishedYear}
                  </span>
                </div>
              ) : null}
              {book.language && (
                <div className={styles.metaItem}>
                  <Globe size={16} />
                  <span>
                    {dict.book.language} {(book.language || '').toUpperCase()}
                  </span>
                </div>
              )}
              {activeVersion?.originalTitle && (
                <div className={styles.metaItem}>
                  <FileText size={16} />
                  <span>
                    {dict.book.originalTitle}: {activeVersion.originalTitle}
                  </span>
                </div>
              )}
              {activeVersion?.originalLanguage && (
                <div className={styles.metaItem}>
                  <Globe size={16} />
                  <span>
                    {dict.book.originalLanguage}: {activeVersion.originalLanguage}
                  </span>
                </div>
              )}
              {activeVersion?.copyrightStatus && (
                <div className={styles.metaItem}>
                  <FileText size={16} />
                  <span>
                    {dict.book.copyrightStatus}: {activeVersion.copyrightStatus}
                  </span>
                </div>
              )}
              {activeVersion?.alternativeTitles && activeVersion.alternativeTitles.length > 0 && (
                <div className={styles.metaItem}>
                  <FileText size={16} />
                  <span>
                    {dict.book.alternativeTitles}: {activeVersion.alternativeTitles.join(', ')}
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
              <span className={styles.themesLabel}>{dict.book.themes}</span>
              <div className={styles.themesList}>
                {activeVersion.themes.map((theme: string) => (
                  <span key={theme} className={styles.themeTag}>
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Description section */}
        <div id="summary" className={styles.descriptionWrapper}>
          <h2 className={styles.descriptionTitle}>{descriptionTitle}</h2>
          <DescriptionWrapper showMoreText={dict.book.showMore} showLessText={dict.book.showLess}>
            {book.description ? (
              <div
                className={styles.description}
                dangerouslySetInnerHTML={{ __html: book.description }}
              />
            ) : (
              <p className={styles.description}>{dict.book.noDescription}</p>
            )}
          </DescriptionWrapper>
        </div>

        {/* Dynamically loaded extra details (FAQ, symbols, quotes, characters) to isolate non-critical CSS/JS */}
        {activeVersion && (
          <BookExtraDetails activeVersion={activeVersion} supportedLang={supportedLang} />
        )}

        {/* Book Reviews and Comments */}
        {versionId && (
          <BookReviews
            bookVersionId={versionId}
            lang={lang}
            bookSlug={slug}
            bookId={book.id}
            hasRated={false}
          />
        )}

        {/* Books by the same author */}
        {authorBooks.length > 0 && (
          <section className={styles.relatedSection} style={{ marginTop: '3rem' }}>
            <h2 className={styles.sectionTitle}>{dict.book.sameAuthor}</h2>
            <div className={styles.booksGrid}>
              {authorBooks.map((bookItem) => (
                <BookCard key={bookItem.id} book={bookItem} size="md" />
              ))}
            </div>
          </section>
        )}

        {/* You Might Also Like */}
        {similarBooks.length > 0 && (
          <section className={styles.relatedSection} style={{ marginTop: '3rem' }}>
            <h2 className={styles.sectionTitle}>{dict.book.youMightLike}</h2>
            <div className={styles.booksGrid}>
              {similarBooks.map((bookItem) => (
                <BookCard key={bookItem.id} book={bookItem} size="md" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
