'use client';

import { useState, useMemo, useId } from 'react';
import { Collapse, Drawer, Pagination, Skeleton } from 'antd';
import { BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCategories } from '@/api/hooks/useCategories';
import { useCategoryBooks } from '@/api/hooks/usePublic';
import { BookCard } from '@/components/public/books/BookCard';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, CategoryType } from '@/types/api-schema';
import styles from './TaxonomyDetailClient.module.scss';
import { useRelatedTaxonomies, type TaxonomyLink } from './useRelatedTaxonomies';

interface TaxonomyDetailClientProps {
  lang: SupportedLang;
  slug: string;
  taxonomyType: CategoryType;
}

const BREADCRUMB_LABEL_KEYS: Record<CategoryType, string> = {
  category: 'breadcrumb.categories',
  genre: 'breadcrumb.genres',
  collection: 'breadcrumb.collections',
};

const BREADCRUMB_PATH_NAMES: Record<CategoryType, string> = {
  category: 'categories',
  genre: 'genres',
  collection: 'collections',
};

const CURRENT_SECTION_KEYS: Record<CategoryType, string> = {
  category: 'taxonomy.currentCategory',
  genre: 'taxonomy.currentGenre',
  collection: 'taxonomy.currentCollection',
};

const ALL_LABEL_KEYS: Record<CategoryType, string> = {
  category: 'taxonomy.allCategories',
  genre: 'taxonomy.allGenres',
  collection: 'taxonomy.allCollections',
};

const LINK_KEYS: Record<CategoryType, string> = {
  category: 'taxonomy.categoriesLink',
  genre: 'taxonomy.genresLink',
  collection: 'taxonomy.collectionsLink',
};

function getTypePath(type: CategoryType): string {
  return BREADCRUMB_PATH_NAMES[type];
}

function RelatedSidebarBlock({
  title,
  items,
  path,
  lang,
}: {
  title: string;
  items: TaxonomyLink[];
  path: string;
  lang: string;
}) {
  if (items.length === 0) return null;
  return (
    <>
      <h4 className={styles.sidebarSubtitle}>{title}</h4>
      <nav className={styles.sidebarNav}>
        {items.slice(0, 8).map((item) => (
          <Link key={item.id} href={`/${lang}/${path}/${item.slug}`} className={styles.sidebarLink}>
            {item.name}
          </Link>
        ))}
      </nav>
    </>
  );
}

function RelatedChipsGroup({
  title,
  items,
  path,
  lang,
}: {
  title: string;
  items: TaxonomyLink[];
  path: string;
  lang: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={styles.relatedGroup}>
      <h3 className={styles.relatedGroupTitle}>{title}</h3>
      <div className={styles.chips}>
        {items.slice(0, 8).map((item) => (
          <Link key={item.id} href={`/${lang}/${path}/${item.slug}`} className={styles.chip}>
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function TaxonomyDetailClient({ lang, slug, taxonomyType }: TaxonomyDetailClientProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const descId = useId();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { data: categoryBooksData, isLoading: loadingCatBooks } = useCategoryBooks(
    lang,
    slug,
    currentPage,
    20
  );

  const { data: allCategoriesData } = useCategories({
    type: taxonomyType,
    limit: 100,
  });

  const category = categoryBooksData?.category;
  const total = categoryBooksData?.meta?.total || 0;
  const totalPages = categoryBooksData?.meta?.totalPages || 1;

  const books = useMemo(
    () => (categoryBooksData?.data || []) as BookOverview[],
    [categoryBooksData]
  );

  const allCategories = useMemo(() => allCategoriesData?.data || [], [allCategoriesData]);

  const catTranslation = useMemo(
    () =>
      category?.translation || category?.translations?.find((tr) => tr.language === lang) || null,
    [category, lang]
  );

  const categoryName = catTranslation?.h1 || catTranslation?.name || category?.name || slug;
  const shortDescription = catTranslation?.shortDescription || '';
  const description = catTranslation?.description || category?.description || '';
  const faq = catTranslation?.faq || [];
  const booksCount = category?.booksCount || total;

  const children = useMemo(
    () =>
      category
        ? allCategories
            .filter((cat) => cat.parentId === category.id)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
        : [],
    [category, allCategories]
  );

  const parentCategory = useMemo(
    () => (category?.parentId ? allCategories.find((cat) => cat.id === category.parentId) : null),
    [category, allCategories]
  );

  const currentSectionKey = CURRENT_SECTION_KEYS[taxonomyType];
  const path = getTypePath(taxonomyType);

  const breadcrumbItems = [
    { label: t('breadcrumb.home'), href: `/${lang}` },
    {
      label: t(BREADCRUMB_LABEL_KEYS[taxonomyType]),
      href: `/${lang}/${path}`,
    },
    { label: categoryName },
  ];

  const parentTranslation = useMemo(
    () =>
      parentCategory?.translation ||
      parentCategory?.translations?.find((tr) => tr.language === lang) ||
      null,
    [parentCategory, lang]
  );
  const parentName = parentTranslation?.name || parentCategory?.name || '';

  const [showFullDescription, setShowFullDescription] = useState(false);
  const descriptionIsLong = description.length > 300;

  const filteredBooks = useMemo(
    () =>
      (books as BookOverview[])
        .filter((book) =>
          book.versions?.some(
            (version) => version.language === lang && version.status === 'published'
          )
        )
        .map((book) => {
          const displayVersion =
            book.versions?.find((v) => v.language === lang && v.status === 'published') ||
            book.versions?.find((v) => v.status === 'published') ||
            book.versions?.[0];

          const tagsMap = new Map();
          (
            book.versions as
              | Array<{
                  tags?: Array<{
                    tag?: { id: string; translations?: Array<{ language: string; name: string }> };
                  }>;
                }>
              | undefined
          )?.forEach((version) => {
            version.tags?.forEach((tagItem) => {
              const tagObj = tagItem.tag;
              if (tagObj && tagObj.id) {
                tagsMap.set(tagObj.id, tagObj);
              }
            });
          });

          return {
            ...book,
            title: displayVersion?.title || book.title || '',
            author: displayVersion?.author || book.author || '',
            tags: Array.from(tagsMap.values()),
          };
        }),
    [books, lang]
  );

  const related = useRelatedTaxonomies({
    books: filteredBooks,
    currentId: category?.id,
    lang,
  });

  const faqJsonLd =
    faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        }
      : null;

  if (!category && !loadingCatBooks) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.empty}>
            <BookOpen size={48} />
            <p>{t('taxonomy.noBooks')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <div className={styles.container}>
        <Breadcrumbs items={breadcrumbItems} />

        {/* Hero */}
        <header className={styles.hero}>
          <h1 className={styles.title}>{categoryName}</h1>
          {shortDescription && <p className={styles.shortDescription}>{shortDescription}</p>}
          <p className={styles.count}>{t('taxonomy.booksCount', { count: String(booksCount) })}</p>
          {parentCategory && parentName && (
            <Link href={`/${lang}/${path}/${parentCategory.slug}`} className={styles.parentLink}>
              <ChevronRight size={14} className={styles.parentIcon} />
              {parentName}
            </Link>
          )}
        </header>

        {/* Children chips */}
        {children.length > 0 && (
          <section className={styles.childrenSection}>
            <div className={styles.chips}>
              {children.slice(0, 12).map((child) => {
                const childTranslation =
                  child.translation ||
                  child.translations?.find((tr) => tr.language === lang) ||
                  null;
                const childName = childTranslation?.name || child.name || '';
                const childSlug = childTranslation?.slug || child.slug || '';
                return (
                  <Link
                    key={child.id}
                    href={`/${lang}/${path}/${childSlug}`}
                    className={styles.chip}
                  >
                    {childName}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Mobile Browse button */}
        <div className={styles.mobileBrowseBtnWrapper}>
          <button
            type="button"
            className={styles.mobileBrowseBtn}
            onClick={() => setMobileSidebarOpen(true)}
            aria-label={t('taxonomy.browse')}
          >
            {t('taxonomy.browse')}
          </button>
        </div>

        {/* Sidebar + Main layout */}
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.stickySidebar}>
              <h3 className={styles.sidebarTitle}>{t('taxonomy.browse')}</h3>
              <nav className={styles.sidebarNav}>
                <Link href={`/${lang}/catalog`} className={styles.sidebarLink}>
                  {t('taxonomy.allBooks')}
                </Link>
                <Link href={`/${lang}/${path}`} className={styles.sidebarLink}>
                  {t(ALL_LABEL_KEYS[taxonomyType])}
                </Link>
              </nav>

              <h4 className={styles.sidebarSubtitle}>{t(currentSectionKey)}</h4>
              <nav className={styles.sidebarNav}>
                {allCategories
                  .filter(
                    (cat) =>
                      cat.parentId === (category?.parentId || null) && cat.id !== category?.id
                  )
                  .filter((cat) => cat.isVisible !== false && (cat.booksCount || 0) > 0)
                  .sort(
                    (a, b) =>
                      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
                  )
                  .slice(0, 10)
                  .map((sibling) => {
                    const sibTranslation =
                      sibling.translation ||
                      sibling.translations?.find((tr) => tr.language === lang) ||
                      null;
                    const sibName = sibTranslation?.name || sibling.name || '';
                    const sibSlug = sibTranslation?.slug || sibling.slug || '';
                    return (
                      <Link
                        key={sibling.id}
                        href={`/${lang}/${path}/${sibSlug}`}
                        className={styles.sidebarLink}
                      >
                        {sibName}
                      </Link>
                    );
                  })}
              </nav>

              {taxonomyType !== 'category' && (
                <RelatedSidebarBlock
                  title={t('taxonomy.relatedCategories')}
                  items={related.relatedCategories}
                  path="category"
                  lang={lang}
                />
              )}
              {taxonomyType !== 'genre' && (
                <RelatedSidebarBlock
                  title={t('taxonomy.relatedGenres')}
                  items={related.relatedGenres}
                  path="genre"
                  lang={lang}
                />
              )}
              {taxonomyType !== 'collection' && (
                <RelatedSidebarBlock
                  title={t('taxonomy.relatedCollections')}
                  items={related.relatedCollections}
                  path="collection"
                  lang={lang}
                />
              )}
              <RelatedSidebarBlock
                title={t('taxonomy.relatedTags')}
                items={related.relatedTags}
                path="tag"
                lang={lang}
              />
            </div>
          </aside>

          <Drawer
            title={t('taxonomy.browse')}
            placement="left"
            onClose={() => setMobileSidebarOpen(false)}
            open={mobileSidebarOpen}
            className={styles.mobileSidebarDrawer}
            width={280}
            aria-label={t('taxonomy.browse')}
          >
            <div className={styles.stickySidebar}>
              <h3 className={styles.sidebarTitle}>{t('taxonomy.browse')}</h3>
              <nav className={styles.sidebarNav}>
                <Link href={`/${lang}/catalog`} className={styles.sidebarLink}>
                  {t('taxonomy.allBooks')}
                </Link>
                <Link href={`/${lang}/${path}`} className={styles.sidebarLink}>
                  {t(ALL_LABEL_KEYS[taxonomyType])}
                </Link>
              </nav>

              <h4 className={styles.sidebarSubtitle}>{t(currentSectionKey)}</h4>
              <nav className={styles.sidebarNav}>
                {allCategories
                  .filter(
                    (cat) =>
                      cat.parentId === (category?.parentId || null) && cat.id !== category?.id
                  )
                  .filter((cat) => cat.isVisible !== false && (cat.booksCount || 0) > 0)
                  .sort(
                    (a, b) =>
                      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
                  )
                  .slice(0, 10)
                  .map((sibling) => {
                    const sibTranslation =
                      sibling.translation ||
                      sibling.translations?.find((tr) => tr.language === lang) ||
                      null;
                    const sibName = sibTranslation?.name || sibling.name || '';
                    const sibSlug = sibTranslation?.slug || sibling.slug || '';
                    return (
                      <Link
                        key={sibling.id}
                        href={`/${lang}/${path}/${sibSlug}`}
                        className={styles.sidebarLink}
                      >
                        {sibName}
                      </Link>
                    );
                  })}
              </nav>

              {taxonomyType !== 'category' && (
                <RelatedSidebarBlock
                  title={t('taxonomy.relatedCategories')}
                  items={related.relatedCategories}
                  path="category"
                  lang={lang}
                />
              )}
              {taxonomyType !== 'genre' && (
                <RelatedSidebarBlock
                  title={t('taxonomy.relatedGenres')}
                  items={related.relatedGenres}
                  path="genre"
                  lang={lang}
                />
              )}
              {taxonomyType !== 'collection' && (
                <RelatedSidebarBlock
                  title={t('taxonomy.relatedCollections')}
                  items={related.relatedCollections}
                  path="collection"
                  lang={lang}
                />
              )}
              <RelatedSidebarBlock
                title={t('taxonomy.relatedTags')}
                items={related.relatedTags}
                path="tag"
                lang={lang}
              />
            </div>
          </Drawer>

          <div className={styles.main}>
            {loadingCatBooks ? (
              <div className={styles.grid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={styles.skeletonCard}>
                    <Skeleton.Button active className={styles.skeletonCover} />
                    <Skeleton active paragraph={{ rows: 2 }} title={false} />
                  </div>
                ))}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className={styles.empty}>
                <BookOpen size={48} />
                <p>{t('taxonomy.noBooks')}</p>
              </div>
            ) : (
              <>
                <div className={styles.grid}>
                  {filteredBooks.map((book) => (
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

            {/* Main related block */}
            {(related.relatedGenres.length > 0 ||
              related.relatedCategories.length > 0 ||
              related.relatedCollections.length > 0 ||
              related.relatedTags.length > 0) && (
              <section className={styles.relatedMainSection}>
                <h2 className={styles.sectionTitle}>{t('taxonomy.relatedThemes')}</h2>
                <RelatedChipsGroup
                  title={t('taxonomy.relatedGenres')}
                  items={related.relatedGenres}
                  path="genre"
                  lang={lang}
                />
                <RelatedChipsGroup
                  title={t('taxonomy.relatedCategories')}
                  items={related.relatedCategories}
                  path="category"
                  lang={lang}
                />
                <RelatedChipsGroup
                  title={t('taxonomy.relatedCollections')}
                  items={related.relatedCollections}
                  path="collection"
                  lang={lang}
                />
                <RelatedChipsGroup
                  title={t('taxonomy.relatedTags')}
                  items={related.relatedTags}
                  path="tag"
                  lang={lang}
                />
              </section>
            )}

            {/* Description */}
            {description && (
              <section className={styles.descriptionSection}>
                <h2 className={styles.sectionTitle}>
                  {t('taxonomy.about', { name: categoryName })}
                </h2>
                <div
                  id={descId}
                  className={`${styles.description} ${
                    !showFullDescription && descriptionIsLong ? styles.descriptionCollapsed : ''
                  }`}
                  dangerouslySetInnerHTML={{ __html: description }}
                />
                {descriptionIsLong && (
                  <button
                    type="button"
                    className={styles.toggleButton}
                    onClick={() => setShowFullDescription((prev) => !prev)}
                    aria-expanded={showFullDescription}
                    aria-controls={descId}
                  >
                    {showFullDescription ? t('book.showLess') : t('book.showMore')}
                  </button>
                )}
              </section>
            )}

            {/* FAQ */}
            {faq.length > 0 && (
              <section className={styles.faqSection}>
                <h2 className={styles.sectionTitle}>{t('tag.faq')}</h2>
                <Collapse
                  accordion
                  items={faq.map((item, idx) => ({
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
                <Link href={`/${lang}/${path}`} className={styles.bottomLink}>
                  {t(LINK_KEYS[taxonomyType])}
                </Link>
                <Link href={`/${lang}/catalog`} className={styles.bottomLink}>
                  {t('taxonomy.allBooksLink')}
                </Link>
                <Link href={`/${lang}/tags`} className={styles.bottomLink}>
                  {t('taxonomy.tagsLink')}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
