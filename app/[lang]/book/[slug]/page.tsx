import { Suspense } from 'react';
import { BookOpen, Calendar, Globe, User, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { permanentRedirect, notFound } from 'next/navigation';
import { StarRating } from '@/components/public/books/StarRating';
import { SmartBackButton } from '@/components/public/navigation/SmartBackButton';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getDefaultLang } from '@/lib/i18n/lang';
import { noteDegraded } from '@/lib/seo/degraded';
import { resolveRetiredSlug } from '@/lib/seo/retired-slug';
import { toPublicAlternates, toPublicJsonLd, toPublicUrl } from '@/lib/seo/urls';
import { handleContentFailure, isNotFoundError } from '@/lib/utils/content-failure';
import { logError } from '@/lib/utils/log-error';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import styles from './book.module.scss';
import { getCachedBookOverview, getCachedBookSeo } from './bookData';
import { BookTaxonomyChips } from './BookTaxonomyChips';
import DescriptionWrapper from './DescriptionWrapper';
import { RelatedBooksSection } from './RelatedBooksSection';

const ReviewsLoading = () => {
  let text = getDictionary(getDefaultLang()).book.loadingReviews;
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
    const alternatesLanguages = toPublicAlternates(seo.hreflangs || seo.hreflang);

    return {
      title: seo.meta.title,
      description: seo.meta.description || undefined,
      robots: seo.meta.robots || undefined,
      alternates: {
        canonical: toPublicUrl(seo.meta.canonicalUrl),
        languages: alternatesLanguages,
      },
      openGraph: {
        title: seo.openGraph.title,
        description: seo.openGraph.description || undefined,
        type: 'book',
        url: toPublicUrl(seo.openGraph.url),
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

    // A 404 is an answer: this book does not exist here. Narrowing on it is
    // allowed, and the page body reaches the same conclusion through
    // handleContentFailure. Everything else is a transport failure.
    if (isNotFoundError(error)) {
      let fallbackTitle = getDictionary(supportedLang).book.metaFallback;
      if (slug) {
        const decoded = decodeURIComponent(slug).replace(/-/g, ' ');
        fallbackTitle =
          decoded.replace(
            /\w\S*/g,
            (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
          ) + ' - Bibliaris';
      }
      return { title: fallbackTitle, robots: { index: false, follow: true } };
    }

    // LEGACY-063 hardened this page's BODY; its metadata kept the LEGACY-069
    // shape — a title and no `robots`, which is `index` by default, on the
    // highest-value page type on the site.
    //
    // Unlike a taxonomy term, a book has NO independently computable half: the
    // bundle is the only source of the verdict. So there is nothing to narrow
    // with and nothing to guess from. Rethrowing answers 5xx, which Google reads
    // as temporary and repairs on the next successful crawl at nearly zero cost —
    // whereas a guessed `noindex` on 40 book URLs is a directive costing days and
    // a manual restore, and a guessed `index` is how the defect started.
    noteDegraded({
      surface: 'book-detail',
      reason: 'bundle-unreadable',
      lang: supportedLang,
      slug,
      outcome: 'threw-5xx',
    });
    throw error;
  }
}

export const revalidate = 300;

export default async function BookDetailPage({ params }: Props) {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;

  // Two requests, two different consequences — and they must not share a fate.
  //
  // This used to be one `Promise.all` inside a blanket catch, after which
  // `if (!book) notFound()`. Any failure of either request therefore produced a
  // **404**: a rate-limited or briefly unavailable API deleted an existing book,
  // and with `revalidate = 300` that 404 was then cached for up to five minutes.
  // Measured on production: /ru/book/gordost-i-predubezhdenie and
  // /ru/book/grozovoy-pereval answered 404 on ~5% of 100 requests while the API
  // answered 200 on 100 of 100; a control book never 404'd at all.
  //
  // So: only the API's own 404 means the book does not exist. Anything else is
  // "could not find out" and must surface as 5xx, which nothing caches as a
  // missing page. And the SEO bundle is decoration — its failure costs metadata,
  // never the page.
  const [book, seoData] = await Promise.all([
    getCachedBookOverview(supportedLang, slug).catch(async (error) => {
      logError('Error loading book overview:', error);
      // API ответил 404 — книги по этому слагу нет. Прежде чем отдать 404, спросить
      // историю слагов (LEGACY-062): книга могла быть переименована, и тогда у этого
      // адреса есть законный преемник. 308 переносит накопленные сигналы, 404 их
      // теряет, и заметно это становится через недели, по падению трафика.
      if (isNotFoundError(error)) {
        const retired = await resolveRetiredSlug('book', supportedLang, slug);
        if (retired && retired !== slug) {
          permanentRedirect(`/${supportedLang}/book/${retired}`);
        }
      }
      return handleContentFailure(error, notFound);
    }),
    getCachedBookSeo(supportedLang, slug).catch((error) => {
      logError('Error loading book SEO bundle:', error);
      return null;
    }),
  ]);

  if (!book) {
    // Второй, независимый путь к тому же выводу: запрос не бросил, но сущности нет
    // (вырожденный 200/204 — `handleResponse` отдаёт `undefined`). Он обязан
    // заглянуть в историю так же, как ветка выше: закрытие одного пути дало бы
    // редирект «через раз», в зависимости от того, как именно API сообщил об
    // отсутствии.
    const retired = await resolveRetiredSlug('book', supportedLang, slug);
    if (retired && retired !== slug) {
      permanentRedirect(`/${supportedLang}/book/${retired}`);
    }
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
            dangerouslySetInnerHTML={{ __html: JSON.stringify(toPublicJsonLd(seoData.schema)) }}
          />
        )}

        <nav className={styles.breadcrumbs} aria-label={dict.a11y.breadcrumb}>
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

            <BookTaxonomyChips
              lang={supportedLang}
              terms={book.categories ?? []}
              variant="categories"
            />

            <BookActions
              slug={slug}
              lang={supportedLang}
              bookId={book.id}
              versionId={versionId}
              textVersion={textVersion}
              audioVersion={audioVersion}
              hasSummary={hasSummary}
            />

            <BookTaxonomyChips lang={supportedLang} terms={book.tags ?? []} variant="tags" />

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

        {activeVersion && <BookExtraDetails activeVersion={activeVersion} />}

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
