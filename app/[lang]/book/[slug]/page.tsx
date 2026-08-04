import { Suspense } from 'react';
import { BookOpen, Calendar, Globe, User, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { permanentRedirect, notFound } from 'next/navigation';
import { StarRating } from '@/components/public/books/StarRating';
import { SmartBackButton } from '@/components/public/navigation/SmartBackButton';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import styles from './book.module.scss';
import { getCachedBookOverview, getCachedBookSeo } from './bookData';
import DescriptionWrapper from './DescriptionWrapper';
import { RelatedBooksSection } from './RelatedBooksSection';

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
    const seo = await getCachedBookSeo(supportedLang, slug);
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

  let seoData;
  let book;

  try {
    [book, seoData] = await Promise.all([
      getCachedBookOverview(supportedLang, slug),
      getCachedBookSeo(supportedLang, slug),
    ]);
  } catch (error) {
    console.error('Error loading book overview or SEO data:', error);
  }

  if (!book) {
    notFound();
  }

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

  const textHasSummary = textVersion
    ? ((textVersion as unknown as { _count?: { summaries: number } })._count?.summaries || 0) > 0
    : false;
  const audioHasSummary = audioVersion
    ? ((audioVersion as unknown as { _count?: { summaries: number } })._count?.summaries || 0) > 0
    : false;
  const hasSummary = textHasSummary || audioHasSummary;
  const versionId = textVersion?.id || audioVersion?.id || book.versions?.[0]?.id;

  const fallbackHref = (() => {
    const bp = seoData?.breadcrumbPath;
    if (bp && bp.length > 0) {
      const last = bp[bp.length - 1];
      if (last.type && last.slug) {
        const taxType =
          last.type === 'genre' || last.type === 'collection' ? last.type : 'category';
        return `/${supportedLang}/${taxType}/${last.slug}`;
      }
    }
    return `/${supportedLang}/catalog`;
  })();

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
            {seoData?.breadcrumbPath?.map((item: { slug: string; name: string; type?: string }) => {
              const taxonomyType =
                item.type === 'genre' || item.type === 'collection' ? item.type : 'category';
              const href = item.type ? `/${supportedLang}/${taxonomyType}/${item.slug}` : null;
              return (
                <li key={item.slug} className={styles.breadcrumbItem}>
                  <span className={styles.separator} aria-hidden="true">
                    /
                  </span>
                  {href ? <Link href={href}>{item.name}</Link> : <span>{item.name}</span>}
                </li>
              );
            })}
            <li className={styles.breadcrumbItem} aria-current="page">
              <span className={styles.separator} aria-hidden="true">
                /
              </span>
              <span className={styles.current}>{activeVersion?.title || book.title}</span>
            </li>
          </ol>
        </nav>

        <SmartBackButton
          label={dict.book.back}
          fallbackHref={fallbackHref}
          className={styles.backBtn}
        />

        <div className={styles.heroGrid}>
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
                  sizes="200px"
                  quality={80}
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

            <BookRating bookId={book.id} slug={slug} lang={supportedLang} />

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
                    className={styles.tagButton}
                  >
                    {trans?.name || cat.id}
                  </Link>
                );
              })}
            </div>

            <BookActions
              slug={slug}
              lang={supportedLang}
              bookId={book.id}
              versionId={versionId}
              textVersion={textVersion}
              audioVersion={audioVersion}
              hasSummary={hasSummary}
            />

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
                      className={styles.tagButton}
                    >
                      {tagName}
                    </Link>
                  );
                })}
              </div>
            )}

            <div className={styles.metadataList}>
              {(activeVersion?.author || book.author) && (
                <div className={styles.metaItem}>
                  <User size={16} aria-hidden="true" />
                  <span>
                    {dict.book.author}: {activeVersion?.author || book.author}
                  </span>
                </div>
              )}
              {book.firstPublishedYear ? (
                <div className={styles.metaItem}>
                  <Calendar size={16} aria-hidden="true" />
                  <span>
                    {dict.book.firstPublished} {book.firstPublishedYear}
                  </span>
                </div>
              ) : null}
              {book.editionPublishedYear ? (
                <div className={styles.metaItem}>
                  <Calendar size={16} aria-hidden="true" />
                  <span>
                    {dict.book.editionPublished} {book.editionPublishedYear}
                  </span>
                </div>
              ) : null}
              {book.language && (
                <div className={styles.metaItem}>
                  <Globe size={16} aria-hidden="true" />
                  <span>
                    {dict.book.language} {(book.language || '').toUpperCase()}
                  </span>
                </div>
              )}
              {activeVersion?.originalTitle && (
                <div className={styles.metaItem}>
                  <FileText size={16} aria-hidden="true" />
                  <span>
                    {dict.book.originalTitle}: {activeVersion.originalTitle}
                  </span>
                </div>
              )}
              {activeVersion?.originalLanguage && (
                <div className={styles.metaItem}>
                  <Globe size={16} aria-hidden="true" />
                  <span>
                    {dict.book.originalLanguage}: {activeVersion.originalLanguage}
                  </span>
                </div>
              )}
              {activeVersion?.copyrightStatus && (
                <div className={styles.metaItem}>
                  <FileText size={16} aria-hidden="true" />
                  <span>
                    {dict.book.copyrightStatus}: {activeVersion.copyrightStatus}
                  </span>
                </div>
              )}
              {activeVersion?.alternativeTitles && activeVersion.alternativeTitles.length > 0 && (
                <div className={styles.metaItem}>
                  <FileText size={16} aria-hidden="true" />
                  <span>
                    {dict.book.alternativeTitles}: {activeVersion.alternativeTitles.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

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

        {activeVersion && (
          <BookExtraDetails activeVersion={activeVersion} supportedLang={supportedLang} />
        )}

        {versionId && (
          <BookReviews
            bookVersionId={versionId}
            lang={lang}
            bookSlug={slug}
            bookId={book.id}
            hasRated={false}
          />
        )}

        <Suspense fallback={null}>
          <RelatedBooksSection lang={lang} slug={slug} />
        </Suspense>
      </div>
    </div>
  );
}
