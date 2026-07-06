'use client';

import { useState, useMemo } from 'react';
import { Collapse, Pagination, Skeleton } from 'antd';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTagBooks } from '@/api/hooks/usePublic';
import { BookCard } from '@/components/public/books/BookCard';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';
import styles from './page.module.scss';

type TagDetailClientProps = {
  lang: string;
  tagSlug: string;
};

export default function TagDetailClient({ lang, tagSlug }: TagDetailClientProps) {
  const supportedLang = lang as SupportedLang;
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const { data: tagBooksData, isLoading } = useTagBooks(supportedLang, tagSlug, currentPage, 20);

  const books = useMemo(() => (tagBooksData?.data || []) as BookOverview[], [tagBooksData]);
  const tag = tagBooksData?.tag;
  const total = tagBooksData?.meta?.total || 0;
  const totalPages = tagBooksData?.meta?.totalPages || 1;

  const tagTranslation = useMemo(
    () =>
      tag?.translations?.find((tr) => tr.language === supportedLang) ||
      tag?.translations?.[0] ||
      null,
    [tag, supportedLang]
  );

  const tagName = tagTranslation?.h1 || tagTranslation?.name || tag?.name || tagSlug;
  const tagDescription = tagTranslation?.description || '';
  const tagShortDescription = tagTranslation?.shortDescription || '';
  const tagFaq = tagTranslation?.faq || [];
  const relatedTagSlugs = tagTranslation?.relatedTagSlugs || [];
  const relatedGenreSlugs = tagTranslation?.relatedGenreSlugs || [];
  const relatedCategorySlugs = tagTranslation?.relatedCategorySlugs || [];
  const relatedCollectionSlugs = tagTranslation?.relatedCollectionSlugs || [];

  const [showFullDescription, setShowFullDescription] = useState(false);
  const descriptionIsLong = tagDescription.length > 300;

  const breadcrumbItems = [
    { label: t('breadcrumb.home'), href: `/${supportedLang}` },
    { label: t('tags.allTags'), href: `/${supportedLang}/tags` },
    { label: tagName },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t('breadcrumb.home'),
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
        {/* Layout */}
        <div className={styles.layout}>
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.stickySidebar}>
              <h3 className={styles.sidebarTitle}>{t('taxonomy.browse')}</h3>
              <nav className={styles.sidebarNav}>
                <Link href={`/${supportedLang}/catalog`} className={styles.sidebarLink}>
                  {t('taxonomy.allBooks')}
                </Link>
                <Link href={`/${supportedLang}/tags`} className={styles.sidebarLink}>
                  {t('taxonomy.allTags')}
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main */}
          <div className={styles.main}>
            <Breadcrumbs items={breadcrumbItems} />

            <header className={styles.hero}>
              <h1 className={styles.title}>{tagName}</h1>
              {tagShortDescription && (
                <p className={styles.shortDescription}>{tagShortDescription}</p>
              )}
              {!isLoading && total > 0 && (
                <p className={styles.count}>
                  {total} {t('tag.books')}
                </p>
              )}
            </header>

            {/* Books List */}
            {isLoading ? (
              <div className={styles.grid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={styles.skeletonCard}>
                    <Skeleton.Button active className={styles.skeletonCover} />
                    <Skeleton active paragraph={{ rows: 2 }} title={false} />
                  </div>
                ))}
              </div>
            ) : books.length === 0 ? (
              <div className={styles.empty}>
                <BookOpen size={48} />
                <p>{t('tag.noBooks')}</p>
              </div>
            ) : (
              <>
                <div className={styles.grid}>
                  {books.map((book) => (
                    <BookCard key={book.id} book={book} size="md" />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <Pagination
                      current={currentPage}
                      total={total}
                      pageSize={20}
                      showSizeChanger={false}
                    />
                  </div>
                )}
              </>
            )}

            {/* Description */}
            {tagDescription && (
              <section className={styles.descriptionSection}>
                <h2 className={styles.sectionTitle}>{t('taxonomy.about', { name: tagName })}</h2>
                <div
                  className={`${styles.description} ${
                    !showFullDescription && descriptionIsLong ? styles.descriptionCollapsed : ''
                  }`}
                  dangerouslySetInnerHTML={{ __html: tagDescription }}
                />
                {descriptionIsLong && (
                  <button
                    type="button"
                    className={styles.toggleButton}
                    onClick={() => setShowFullDescription((prev) => !prev)}
                  >
                    {showFullDescription ? t('book.showLess') : t('book.showMore')}
                  </button>
                )}
              </section>
            )}

            {/* Related Tags */}
            {relatedTagSlugs.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.sectionTitle}>{t('tag.relatedTags')}</h2>
                <div className={styles.relatedChips}>
                  {relatedTagSlugs.map((slug) => (
                    <Link
                      key={slug}
                      href={`/${supportedLang}/tag/${slug}`}
                      className={styles.relatedChip}
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
                <div className={styles.relatedChips}>
                  {relatedGenreSlugs.map((slug) => (
                    <Link
                      key={slug}
                      href={`/${supportedLang}/genre/${slug}`}
                      className={styles.relatedChip}
                    >
                      {slug}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Related Categories */}
            {relatedCategorySlugs.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.sectionTitle}>{t('tag.relatedCategories')}</h2>
                <div className={styles.relatedChips}>
                  {relatedCategorySlugs.map((slug: string) => (
                    <Link
                      key={slug}
                      href={`/${supportedLang}/category/${slug}`}
                      className={styles.relatedChip}
                    >
                      {slug}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Related Collections */}
            {relatedCollectionSlugs.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.sectionTitle}>{t('tag.relatedCollections')}</h2>
                <div className={styles.relatedChips}>
                  {relatedCollectionSlugs.map((slug: string) => (
                    <Link
                      key={slug}
                      href={`/${supportedLang}/collection/${slug}`}
                      className={styles.relatedChip}
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
                <Collapse
                  accordion
                  items={tagFaq.map((item, idx) => ({
                    key: String(idx),
                    label: item.question,
                    children: <p className={styles.faqAnswer}>{item.answer}</p>,
                  }))}
                />
              </section>
            )}

            {/* Bottom links */}
            <section className={styles.bottomLinks}>
              <h2 className={styles.sectionTitle}>{t('taxonomy.exploreMore')}</h2>
              <div className={styles.bottomLinksList}>
                <Link href={`/${supportedLang}/tags`} className={styles.bottomLink}>
                  {t('taxonomy.tagsLink')}
                </Link>
                <Link href={`/${supportedLang}/catalog`} className={styles.bottomLink}>
                  {t('taxonomy.allBooksLink')}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
