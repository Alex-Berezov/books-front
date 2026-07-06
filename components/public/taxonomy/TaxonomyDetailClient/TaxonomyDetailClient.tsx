'use client';

import { useState, useMemo } from 'react';
import { Collapse, Pagination, Skeleton } from 'antd';
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

export function TaxonomyDetailClient({ lang, slug, taxonomyType }: TaxonomyDetailClientProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

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
    () => (category ? allCategories.filter((cat) => cat.parentId === category.id) : []),
    [category, allCategories]
  );

  const parentCategory = useMemo(
    () => (category?.parentId ? allCategories.find((cat) => cat.id === category.parentId) : null),
    [category, allCategories]
  );

  const currentSectionKey = CURRENT_SECTION_KEYS[taxonomyType];

  const breadcrumbItems = [
    { label: t('breadcrumb.home'), href: `/${lang}` },
    {
      label: t(BREADCRUMB_LABEL_KEYS[taxonomyType]),
      href: `/${lang}/${BREADCRUMB_PATH_NAMES[taxonomyType]}`,
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
      <div className={styles.container}>
        <Breadcrumbs items={breadcrumbItems} />

        {/* Hero */}
        <header className={styles.hero}>
          <h1 className={styles.title}>{categoryName}</h1>
          {shortDescription && <p className={styles.shortDescription}>{shortDescription}</p>}
          <p className={styles.count}>{t('taxonomy.booksCount', { count: String(booksCount) })}</p>
          {parentCategory && parentName && (
            <Link
              href={`/${lang}/${BREADCRUMB_PATH_NAMES[taxonomyType]}/${parentCategory.slug}`}
              className={styles.parentLink}
            >
              <ChevronRight size={14} className={styles.parentIcon} />
              {parentTranslation?.name || parentCategory?.name || ''}
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
                    href={`/${lang}/${BREADCRUMB_PATH_NAMES[taxonomyType]}/${childSlug}`}
                    className={styles.chip}
                  >
                    {childName}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Sidebar + Main content */}
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.stickySidebar}>
              <h3 className={styles.sidebarTitle}>{t('taxonomy.browse')}</h3>
              <nav className={styles.sidebarNav}>
                <Link href={`/${lang}/catalog`} className={styles.sidebarLink}>
                  {t('taxonomy.allBooks')}
                </Link>
                <Link
                  href={`/${lang}/${BREADCRUMB_PATH_NAMES[taxonomyType]}`}
                  className={styles.sidebarLink}
                >
                  {t(
                    `taxonomy.all${taxonomyType === 'category' ? 'Categories' : taxonomyType === 'genre' ? 'Genres' : 'Collections'}`
                  )}
                </Link>
              </nav>

              <h4 className={styles.sidebarSubtitle}>{t(currentSectionKey)}</h4>
              <nav className={styles.sidebarNav}>
                {allCategories
                  .filter(
                    (cat) =>
                      cat.parentId === (category?.parentId || null) && cat.id !== category?.id
                  )
                  .slice(0, 15)
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
                        href={`/${lang}/${BREADCRUMB_PATH_NAMES[taxonomyType]}/${sibSlug}`}
                        className={styles.sidebarLink}
                      >
                        {sibName}
                      </Link>
                    );
                  })}
              </nav>
            </div>
          </aside>

          <div className={styles.main}>
            {/* Book Grid */}
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

            {/* Description */}
            {description && (
              <section className={styles.descriptionSection}>
                <h2 className={styles.sectionTitle}>
                  {t('taxonomy.about', { name: categoryName })}
                </h2>
                <div
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
                <Link
                  href={`/${lang}/${BREADCRUMB_PATH_NAMES[taxonomyType]}`}
                  className={styles.bottomLink}
                >
                  {t(
                    `taxonomy.${taxonomyType === 'category' ? 'categoriesLink' : taxonomyType === 'genre' ? 'genresLink' : 'collectionsLink'}`
                  )}
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
