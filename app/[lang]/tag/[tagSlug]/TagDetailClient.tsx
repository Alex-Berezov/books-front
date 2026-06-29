'use client';

import { Skeleton, Pagination } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTagBooks } from '@/api/hooks/usePublic';
import { BookCard } from '@/components/public/books/BookCard';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';
import styles from './page.module.scss';

type TagDetailClientProps = {
  lang: string;
  tagSlug: string;
  initialPage?: number;
};

export default function TagDetailClient({ lang, tagSlug, initialPage = 1 }: TagDetailClientProps) {
  const supportedLang = lang as SupportedLang;
  const { t } = useTranslation();
  const router = useRouter();

  const { data: tagBooksData, isLoading } = useTagBooks(supportedLang, tagSlug, initialPage, 20);
  const books = (tagBooksData?.data || []) as BookOverview[];
  const tag = tagBooksData?.tag;
  const total = tagBooksData?.meta?.total || 0;
  const totalPages = tagBooksData?.meta?.totalPages || 1;

  // Get translated tag info
  const tagTranslation =
    tag?.translations?.find((tr) => tr.language === supportedLang) || tag?.translations?.[0];
  const tagName = tagTranslation?.h1 || tagTranslation?.name || tag?.name || tagSlug;
  const tagDescription = tagTranslation?.description || '';
  const tagShortDescription = tagTranslation?.shortDescription || '';
  const tagFaq = tagTranslation?.faq || [];
  const relatedTagSlugs = tagTranslation?.relatedTagSlugs || [];
  const relatedGenreSlugs = tagTranslation?.relatedGenreSlugs || [];

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page === 1) {
      router.push(`/${supportedLang}/tag/${tagSlug}`);
    } else {
      router.push(`/${supportedLang}/tag/${tagSlug}?page=${page}`);
    }
  };

  // JSON-LD for CollectionPage and BreadcrumbList
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t('book.home'),
            item: `https://bibliaris.com/${supportedLang}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: t('tags.allTags'),
            item: `https://bibliaris.com/${supportedLang}/tags`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: tagName,
            item: `https://bibliaris.com/${supportedLang}/tag/${tagSlug}`,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: tagName,
        description: tagDescription || `${tagName} books on Bibliaris`,
        url: `https://bibliaris.com/${supportedLang}/tag/${tagSlug}`,
        numberOfItems: total,
      },
    ],
  };

  return (
    <div className={styles.tagPage}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={styles.container}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href={`/${supportedLang}`}>{t('book.home')}</Link>
            </li>
            <li>
              <span className={styles.separator}>/</span>
              <Link href={`/${supportedLang}/tags`}>{t('tags.allTags')}</Link>
            </li>
            <li>
              <span className={styles.separator}>/</span>
              <span className={styles.current}>{tagName}</span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>{tagName}</h1>
          {tagShortDescription && <p className={styles.shortDescription}>{tagShortDescription}</p>}
          {tagDescription && (
            <div
              className={styles.description}
              dangerouslySetInnerHTML={{ __html: tagDescription }}
            />
          )}
          {!isLoading && total > 0 && (
            <p className={styles.count}>
              {total} {t('tag.books')}
            </p>
          )}
        </header>

        {/* Books List */}
        {isLoading ? (
          <div className={styles.loading}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <Skeleton.Button active className={styles.skeletonCover} />
                <Skeleton active paragraph={{ rows: 2 }} title={false} />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className={styles.empty}>
            <p>{t('tag.noBooks')}</p>
          </div>
        ) : (
          <>
            <div className={styles.booksGrid}>
              {books.map((book) => (
                <BookCard key={book.id} book={book} size="md" />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <Pagination
                  current={initialPage}
                  total={total}
                  pageSize={20}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}

        {/* Related Tags */}
        {relatedTagSlugs.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.sectionTitle}>{t('tag.relatedTags')}</h2>
            <div className={styles.relatedTags}>
              {relatedTagSlugs.map((slug) => (
                <Link
                  key={slug}
                  href={`/${supportedLang}/tag/${slug}`}
                  className={styles.relatedTagLink}
                >
                  {slug}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Genres */}
        {relatedGenreSlugs.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.sectionTitle}>{t('tag.relatedGenres')}</h2>
            <div className={styles.relatedTags}>
              {relatedGenreSlugs.map((slug) => (
                <Link
                  key={slug}
                  href={`/${supportedLang}/catalog/${slug}`}
                  className={styles.relatedTagLink}
                >
                  {slug}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {tagFaq.length > 0 && (
          <section className={styles.faqSection}>
            <h2 className={styles.sectionTitle}>{t('tag.faq')}</h2>
            <div className={styles.faqList}>
              {tagFaq.map((item, idx) => (
                <div key={idx} className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>{item.question}</h3>
                  <p className={styles.faqAnswer}>{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
